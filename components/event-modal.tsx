import { useState, useEffect, useRef } from 'react'
import { X, FileText, Upload, Trash2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CalendarEvent, EventAttachment, User } from '@/lib/types'
import { format } from 'date-fns'
import { parseLocalDate } from '@/lib/event-utils'
import { openStoredFile } from '@/lib/file-utils'
import { getUsers } from '@/lib/api'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { attendees: string[]; attachments?: EventAttachment[] }) => Promise<void>
  onDelete?: () => Promise<void>
  initialDate: string
  editEvent?: CalendarEvent | null
}

const categories: { value: CalendarEvent['category']; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'other', label: 'Other' },
]

export function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  editEvent
}: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [category, setCategory] = useState<string>('meeting')
  const [customCategory, setCustomCategory] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [newAttendee, setNewAttendee] = useState('')
  const [attachments, setAttachments] = useState<EventAttachment[]>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [isAttachmentListOpen, setIsAttachmentListOpen] = useState(false)

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title)
      setDescription(editEvent.description)
      
      const start = new Date(editEvent.startDate)
      const end = new Date(editEvent.endDate)
      
      setDate(editEvent.startDate.slice(0, 10))
      setStartTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`)
      setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`)
      
      const isPredefined = categories.some(cat => cat.value === editEvent.category)
      setCategory(isPredefined ? editEvent.category : 'other')
      setCustomCategory(isPredefined ? '' : editEvent.category)
      setAttendees(editEvent.attendees || [])
      setAttachments(editEvent.attachments || [])
    } else {
      setTitle('')
      setDescription('')
      setDate(initialDate)
      setStartTime('09:00')
      setEndTime('10:00')
      setCategory('meeting')
      setCustomCategory('')
      setAttendees([])
      setAttachments([])
    }
    setNewAttendee('')
    setError('')
    setTitleError(false)
    setIsDeleteConfirmVisible(false)
    setIsAttachmentListOpen(false)
  }, [editEvent, initialDate, isOpen])

  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      setAttendees([...attendees, newAttendee.trim()])
      setNewAttendee('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setIsUploadingFile(true)
    Promise.all(files.map(file => new Promise<EventAttachment>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ fileName: file.name, fileType: file.type, fileSize: file.size, fileUrl: reader.result as string })
      reader.readAsDataURL(file)
    }))).then(next => {
      setAttachments(curr => [...curr, ...next])
      setIsAttachmentListOpen(true)
    })
    .finally(() => setIsUploadingFile(false))
    e.target.value = ''
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setTitleError(true); setError('Title is required'); return }
    if (endTime <= startTime) { setError('End time must be after start time'); return }
    
    try {
      setIsSubmitting(true)
      
      const startDate = new Date(`${date}T${startTime}:00`).toISOString()
      const endDate = new Date(`${date}T${endTime}:00`).toISOString()
      
      await onSave({
        title: title.trim(),
        description: description.trim(),
        startDate,
        endDate,
        category: category === 'other' ? customCategory.trim() : category,
        attendees,
        attachments,
      })
    } catch (err: any) { setError(err.message) } finally { setIsSubmitting(false) }
  }

  const handleConfirmDelete = async () => {
    if (!onDelete) return
    try {
      setIsDeletingEvent(true)
      await onDelete()
      setIsDeleteConfirmVisible(false)
    } catch (err: any) { setError(err.message) } finally { setIsDeletingEvent(false) }
  }

  if (!isOpen) return null
  const formattedDate = format(parseLocalDate(date), 'EEEE, MMMM d, yyyy')
  const shouldCollapseAttachments = attachments.length >= 3

  const renderAttachmentRow = (att: EventAttachment, index: number) => (
    <Tooltip key={`${att.fileName}-${index}`}>
      <TooltipTrigger asChild>
        <div className="group flex items-center justify-between rounded-lg border bg-muted/50 p-2 text-sm transition-colors hover:bg-muted">
          <button
            type="button"
            onClick={() => openStoredFile(att.fileUrl)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            title={`Open ${att.fileName}`}
          >
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="truncate font-medium">{att.fileName}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setAttachments(attachments.filter((_, idx) => idx !== index))}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete attachment"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {att.fileName}
      </TooltipContent>
    </Tooltip>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={true}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl p-6 sm:max-w-xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold">{editEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">Title</Label>
                <Input
                  ref={titleInputRef}
                  id="title"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(false) }}
                  placeholder="Event title"
                  className={`h-9 text-sm ${titleError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-0' : ''}`}
                  aria-invalid={titleError}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-xs font-semibold">Date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-xs font-semibold">Start Time</Label>
                  <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-xs font-semibold">End Time</Label>
                  <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="Event details..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attendees</Label>
                <div className="flex gap-2">
                  <Input
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newAttendee.trim()) {
                        e.preventDefault();
                        handleAddAttendee();
                      }
                    }}
                    placeholder="Add attendee name..."
                    className="h-9 text-sm"
                  />
                  <Button type="button" size="sm" className="h-9 px-3 bg-primary" onClick={handleAddAttendee}>
                    <UserPlus className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {attendees.map((a, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <span className="flex max-w-[150px] cursor-default items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs">
                          <span className="truncate">{a}</span>
                          <X
                            className="size-3 shrink-0 cursor-pointer transition-colors hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttendees(attendees.filter((_, idx) => idx !== i));
                            }}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {a}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attachments</Label>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                <Button type="button" variant="outline" size="sm" className="w-full h-9 text-sm gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="size-4" />
                  {isUploadingFile ? 'Uploading...' : 'Upload Files'}
                </Button>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {shouldCollapseAttachments ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex h-10 w-full items-center justify-between rounded-lg border-dashed px-3 text-sm"
                          onClick={() => setIsAttachmentListOpen((current) => !current)}
                        >
                          <span className="truncate">
                            {attachments.length} uploaded {attachments.length === 1 ? 'file' : 'files'}
                          </span>
                          {isAttachmentListOpen ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
                        </Button>
                    {isAttachmentListOpen && (
                          <div>
                            <div className="grid grid-cols-1 gap-2">
                              {attachments.map((att, i) => renderAttachmentRow(att, i))}
                            </div>
                          </div>
                    )}
                  </>
                ) : (
                      <div>
                        <div className="grid grid-cols-1 gap-2">
                          {attachments.map((att, i) => renderAttachmentRow(att, i))}
                        </div>
                      </div>
                )}
                  </div>
                )}
              </div>

              {error && <p className="mt-2 text-center text-[10px] font-semibold text-destructive">{error}</p>}
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-2 border-t pt-4">
            {editEvent && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-9 px-4"
                disabled={isSubmitting || isDeletingEvent}
                onClick={() => setIsDeleteConfirmVisible(true)}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" size="sm" className="h-9 px-4" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9 px-6 bg-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editEvent ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>

        {isDeleteConfirmVisible && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="space-y-4">
              <p className="font-bold text-lg">Confirm Delete</p>
              <p className="text-sm text-muted-foreground">Permanently remove this event?</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsDeleteConfirmVisible(false)}>No, Back</Button>
                <Button variant="destructive" className="flex-1" onClick={handleConfirmDelete} disabled={isDeletingEvent}>
                  {isDeletingEvent ? 'Deleting...' : 'Yes, Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
