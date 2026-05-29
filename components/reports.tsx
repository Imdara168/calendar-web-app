'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { 
  FileText, 
  Calendar, 
  Trash2,
  FileImage,
  File,
  Eye,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Report, CalendarEvent, User } from '@/lib/types'
import { downloadStoredFile, openStoredFile } from '@/lib/file-utils'
import { getLocalDateString, parseLocalDate, formatTime12h } from '@/lib/event-utils'
import {
  deleteReport,
  getApiErrorMessage,
  getReports,
} from '@/lib/api'

interface ReportsProps {
  user: User
  events: CalendarEvent[]
  onEventsChanged: () => Promise<void>
}

interface FileEntry {
  id: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize?: number
  dateLabel: string
  sourceLabel: string
  reportId?: number
  sortValue: number
}

export function Reports({ user, events, onEventsChanged }: ReportsProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [allReports, setAllReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAllLoading, setIsAllLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [hasSelected, setHasSelected] = useState(true)
  const [error, setError] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingReport, setIsDeletingReport] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([])
  const [reportsToDelete, setReportsToDelete] = useState<
    {
      id: number;
      fileName: string;
      fileUrl: string;
    }[]
  >([])

  // Load ALL reports once on mount
  useEffect(() => {
    const loadAllReports = async () => {
      try {
        setAllReports(await getReports())
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setIsAllLoading(false)
      }
    }

    void loadAllReports()
  }, [])

  // Load filtered reports when date changes
  useEffect(() => {
    if (!hasSelected) {
      setReports([])
      return
    }

    const loadReports = async () => {
      setIsLoading(true)
      try {
        setReports(await getReports(selectedDate))
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadReports()
  }, [selectedDate, hasSelected])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
    setHasSelected(true)
  }

  const handleDelete = useCallback((id: number, fileName: string, fileUrl: string) => {
    setReportsToDelete([{ id, fileName, fileUrl }])
    setIsDeleteDialogOpen(true)
  }, [])

  const toggleReportSelection = useCallback((reportId: number) => {
    setSelectedReportIds(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId],
    )
  }, [])

  const clearSelectedReports = useCallback(() => {
    setSelectedReportIds([])
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedReportIds([])
      }

      return !prev
    })
  }, [])

  const confirmDelete = useCallback(async () => {
    if (reportsToDelete.length === 0) return

    setError('')
    setIsDeletingReport(true)

    try {
      await Promise.all(reportsToDelete.map(report => deleteReport(report.id)))

      const deletedIds = new Set(reportsToDelete.map(report => report.id))
      const deletedFileUrls = new Set(reportsToDelete.map(report => report.fileUrl))

      setAllReports(prev => prev.filter(report => !deletedIds.has(report.id)))
      setReports(prev => prev.filter(report => !deletedFileUrls.has(report.fileUrl)))
      setSelectedReportIds(prev => prev.filter(id => !deletedIds.has(id)))
      setIsSelectionMode(current =>
        current && selectedReportIds.length === deletedIds.size ? false : current,
      )
      setIsDeleteDialogOpen(false)
      setReportsToDelete([])
      await onEventsChanged()
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError))
    } finally {
      setIsDeletingReport(false)
    }
  }, [onEventsChanged, reportsToDelete, selectedReportIds.length])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileUrl: string) => {
    if (fileUrl.startsWith('data:image/')) {
      return <FileImage className="w-5 h-5" />
    }
    return <File className="w-5 h-5" />
  }

  const handleViewFile = useCallback((fileUrl: string) => {
    try {
      openStoredFile(fileUrl)
    } catch {
      setError('Unable to open the file')
    }
  }, [])

  const filesForSelectedDate = useMemo(() => {
    if (!hasSelected) return []
    const entries = new Map<string, FileEntry>()

    for (const event of events) {
      const eventDate = event.startDate.slice(0, 10)
      if (eventDate !== selectedDate || !event.attachments?.length) {
        continue
      }

      event.attachments.forEach((attachment, index) => {
        const matchingReport = reports.find((report) => report.fileUrl === attachment.fileUrl)
        const eventDateTime = new Date(event.startDate)
        const startTimeLabel = formatTime12h(event.startDate)
        
        entries.set(`event:${event.id}:${index}`, {
          id: `event:${event.id}:${index}`,
          fileUrl: attachment.fileUrl,
          fileName: attachment.fileName || `${event.title} attachment`,
          fileType: attachment.fileType || 'application/octet-stream',
          fileSize: attachment.fileSize,
          dateLabel: `${format(parseLocalDate(eventDate), 'MMM d, yyyy')} at ${startTimeLabel}`,
          sourceLabel: `Event: ${event.title}`,
          reportId: matchingReport?.id,
          sortValue: eventDateTime.getTime(),
        })
      })
    }

    for (const report of reports) {
      const reportDate = report.date || getLocalDateString(new Date(report.createdAt))

      if (reportDate !== selectedDate) {
        continue
      }

      const duplicateEventEntry = Array.from(entries.values()).some(
        (entry) => entry.fileUrl === report.fileUrl,
      )

      if (duplicateEventEntry) {
        continue
      }

      // ONLY include reports that are explicitly linked to an event's attachments
      const matchingEvent = events.find((e) =>
        e.attachments?.some((a) => a.fileUrl === report.fileUrl),
      )

      if (!matchingEvent) {
        continue
      }

      entries.set(`report:${report.id}`, {
        id: `report:${report.id}`,
        fileUrl: report.fileUrl,
        fileName: report.fileName,
        fileType:
          report.fileType ||
          (report.fileUrl.startsWith('data:')
            ? report.fileUrl.slice(5, report.fileUrl.indexOf(';')) || 'application/octet-stream'
            : 'application/octet-stream'),
        dateLabel: format(new Date(report.createdAt), 'MMM d, yyyy p'),
        sourceLabel: `Event: ${matchingEvent.title}`,
        reportId: report.id,
        sortValue: new Date(report.createdAt).getTime(),
      })
    }

    return Array.from(entries.values()).sort((left, right) => right.sortValue - left.sortValue)
  }, [events, reports, selectedDate, hasSelected])

  const allUploadedFiles = useMemo(() => {
    return allReports
      .map((report) => {
        // Find an event that has this file in its attachments
        const matchingEvent = events.find((e) =>
          e.attachments?.some((a) => a.fileUrl === report.fileUrl),
        )

        if (!matchingEvent) {
          return null
        }

        return {
          id: `report-all:${report.id}`,
          fileUrl: report.fileUrl,
          fileName: report.fileName,
          fileType: report.fileType || 'application/octet-stream',
          dateLabel: report.date
            ? format(parseLocalDate(report.date), 'MMM d, yyyy')
            : format(new Date(report.createdAt), 'MMM d, yyyy p'),
          sourceLabel: `Event: ${matchingEvent.title}`,
          reportId: report.id,
          sortValue: new Date(report.createdAt).getTime(),
        }
      })
      .filter((file): file is NonNullable<typeof file> => file !== null)
      .sort((left, right) => right.sortValue - left.sortValue)
  }, [allReports, events])

  const selectedUploadedFiles = useMemo(
    () => allUploadedFiles.filter(file => file.reportId && selectedReportIds.includes(file.reportId)),
    [allUploadedFiles, selectedReportIds],
  )

  const openBulkDeleteDialog = useCallback(() => {
    const selectedReports = allUploadedFiles
      .filter(file => file.reportId && selectedReportIds.includes(file.reportId))
      .map(file => ({
        id: file.reportId!,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
      }))

    if (selectedReports.length === 0) {
      return
    }

    setReportsToDelete(selectedReports)
    setIsDeleteDialogOpen(true)
  }, [allUploadedFiles, selectedReportIds])

  const deleteActionLabel = selectedUploadedFiles.length > 1 ? 'Delete All' : 'Delete'
  const isBulkDelete = reportsToDelete.length > 1
  const deleteTargetNames = reportsToDelete.map(report => report.fileName)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-foreground" />
        <h2 className="text-xl font-bold text-foreground">Reports</h2>
      </div>

      {/* Find Files By Date Section */}
      <div className="bg-card border border-border rounded-xl p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-foreground" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Find Files By Date</h3>
            <p className="text-sm text-muted-foreground">
              Only files for the selected day are shown. Please select a date to view files.
            </p>
          </div>
        </div>

        <div className="mb-4 max-w-xs">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {!hasSelected ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p>Please select a date to view associated files</p>
          </div>
        ) : isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filesForSelectedDate.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
            No files found for {format(parseLocalDate(selectedDate), 'MMMM d, yyyy')}
          </div>
        ) : (
          <div className="space-y-3">
            {filesForSelectedDate.map((file) => (
              <div
                key={file.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center"
              >
                <div className="shrink-0 rounded-lg bg-muted p-2">
                  {getFileIcon(file.fileUrl)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground" title={file.fileName}>{file.fileName}</p>
                  <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="max-w-full truncate" title={file.sourceLabel}>
                      {file.sourceLabel}
                    </span>
                    <span>{file.dateLabel}</span>
                    {file.fileSize ? <span>{formatFileSize(file.fileSize)}</span> : null}
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0 sm:flex-nowrap">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewFile(file.fileUrl)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadStoredFile(file.fileUrl, file.fileName)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {file.reportId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.reportId!, file.fileName, file.fileUrl)}
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Uploaded Files Section */}
      <div className="bg-card border border-border rounded-xl p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            Uploaded Files ({allUploadedFiles.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {isSelectionMode && selectedUploadedFiles.length > 0 ? (
              <>
                <span className="text-sm font-medium text-primary">
                  {selectedUploadedFiles.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openBulkDeleteDialog()}
                >
                  {deleteActionLabel}
                </Button>
              </>
            ) : null}
            {isSelectionMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearSelectedReports()
                  toggleSelectionMode()
                }}
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSelectionMode()}
              >
                Select
              </Button>
            )}
          </div>
        </div>

        {isAllLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allUploadedFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allUploadedFiles.map((file) => (
              <div 
                key={file.id}
                onClick={() => {
                  if (isSelectionMode && file.reportId) {
                    toggleReportSelection(file.reportId)
                  }
                }}
                className={[
                  "flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center",
                  isSelectionMode && file.reportId ? "cursor-pointer" : "",
                  file.reportId && selectedReportIds.includes(file.reportId)
                    ? "border-primary bg-primary/5"
                    : "",
                ].join(' ')}
              >
                {isSelectionMode && file.reportId ? (
                  <Checkbox
                    checked={selectedReportIds.includes(file.reportId)}
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={() => toggleReportSelection(file.reportId!)}
                    className="shrink-0"
                  />
                ) : null}
                <div className="shrink-0 rounded-lg bg-muted p-2">
                  {getFileIcon(file.fileUrl)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground" title={file.fileName}>{file.fileName}</p>
                  <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="max-w-full truncate" title={file.sourceLabel}>
                      {file.sourceLabel}
                    </span>
                    <span>{file.dateLabel}</span>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0 sm:flex-nowrap">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleViewFile(file.fileUrl)
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation()
                      downloadStoredFile(file.fileUrl, file.fileName)
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {file.reportId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDelete(file.reportId!, file.fileName, file.fileUrl)
                      }}
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                      disabled={isSelectionMode}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open && !isDeletingReport) {
            setReportsToDelete([])
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {isBulkDelete ? 'Delete Reports?' : 'Delete Report?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBulkDelete ? (
                <>
                  Are you sure you want to delete these {reportsToDelete.length} files?
                  <br />
                  <br />
                  <span className="font-medium text-foreground">
                    {deleteTargetNames.join(', ')}
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">
                    "{reportsToDelete[0]?.fileName}"
                  </span>
                  ?
                </>
              )}
              <br />
              <br />
              This will remove {isBulkDelete ? 'them' : 'it'} everywhere, including all linked event attachments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingReport}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => void confirmDelete()}
              variant="destructive"
              disabled={isDeletingReport}
            >
              {isDeletingReport ? 'Deleting...' : 'Confirm to delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
