'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, UserCircle, FileText, Upload, Trash2 } from 'lucide-react'
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
import type { CalendarEvent, EventAttachment } from '@/lib/types'
import { format } from 'date-fns'
import { parseLocalDate } from '@/lib/event-utils'
import { downloadStoredFile, openStoredFile } from '@/lib/file-utils'

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
  const deleteConfirmRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title)
      setDescription(editEvent.description)
      setDate(editEvent.date)
      setStartTime(editEvent.startTime)
      setEndTime(editEvent.endTime)
      
      const isPredefined = categories.some(cat => cat.value === editEvent.category)
      if (isPredefined) {
        setCategory(editEvent.category)
        setCustomCategory('')
      } else {
        setCategory('other')
        setCustomCategory(editEvent.category)
      }
      
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
  }, [editEvent, initialDate, isOpen])

  useEffect(() => {
    if (!isDeleteConfirmVisible) {
      return
    }

    window.requestAnimationFrame(() => {
      deleteConfirmRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }, [isDeleteConfirmVisible])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploadingFile(true)
    setError('')

    void Promise.all(
      files.map(
        (file) =>
          new Promise<EventAttachment>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileUrl: reader.result as string,
              })
            }
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
          }),
      ),
    )
      .then((nextAttachments) => {
        setAttachments((current) => [...current, ...nextAttachments])
      })
      .catch(() => {
        setError('Failed to read file')
      })
      .finally(() => {
        setIsUploadingFile(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const openAttachmentPreview = (attachment: EventAttachment) => {
    try {
      openStoredFile(attachment.fileUrl)
    } catch {
      setError('Unable to open the attachment preview')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTitleError(false)

    if (!title.trim()) {
      setTitleError(true)
      setError('Please enter a title')
      window.requestAnimationFrame(() => {
        titleInputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
        titleInputRef.current?.focus()
      })
      return
    }

    if (endTime <= startTime) {
      setError('End time must be after start time')
      return
    }

    try {
      setIsSubmitting(true)
      await onSave({
        title: title.trim(),
        description: description.trim(),
        date,
        startTime,
        endTime,
        category: category === 'other' ? customCategory.trim() : category,
        attendees,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!onDelete) return

    try {
      setError('')
      setIsDeletingEvent(true)
      await onDelete()
      setIsDeleteConfirmVisible(false)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete event')
    } finally {
      setIsDeletingEvent(false)
    }
  }

  if (!isOpen) return null

  const formattedDate = format(parseLocalDate(date), 'EEEE, MMMM d, yyyy')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                ref={titleInputRef}
                id="title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (titleError && e.target.value.trim()) {
                    setTitleError(false)
                  }
                }}
                placeholder="Event title"
                aria-invalid={titleError}
              />
            </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Event description (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {category === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="customCategory">Custom Category</Label>
              <Input
                id="customCategory"
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Attendees</Label>
            <div className="flex gap-2">
              <Input
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
                      setAttendees([...attendees, newAttendee.trim()])
                      setNewAttendee('')
                    }
                  }
                }}
                placeholder="Enter attendee name"
              />
              <Button
                type="button"
                onClick={() => {
                  if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
                    setAttendees([...attendees, newAttendee.trim()])
                    setNewAttendee('')
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attendees.map((attendee, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted text-foreground text-sm rounded-full"
                  >
                    <UserCircle className="w-3.5 h-3.5" />
                    {attendee}
                    <button
                      type="button"
                      onClick={() => setAttendees(attendees.filter((_, i) => i !== index))}
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {attachments.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-input bg-background px-4 py-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-lg bg-muted p-2">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      Browse and upload files
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      You can upload more than 2 files for one event.
                    </span>
                  </span>
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    Add more
                  </button>
                </div>
                {attachments.map((attachment, index) => (
                  <div key={`${attachment.fileName}-${index}`} className="rounded-lg border border-input bg-background p-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.fileType} • {formatFileSize(attachment.fileSize)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAttachmentPreview(attachment)}
                          className="px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadStoredFile(attachment.fileUrl, attachment.fileName)}
                          className="px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))
                          }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isUploadingFile && (
              <p className="mt-2 text-xs text-muted-foreground">Uploading attachments...</p>
            )}
          </div>

            {isDeleteConfirmVisible && editEvent && onDelete && (
              <div
                ref={deleteConfirmRef}
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <Trash2 className="mt-0.5 h-5 w-5 text-destructive" />
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        Are you sure you want to delete "{title.trim() || editEvent.title}"?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This will permanently remove the event and delete its attached files from Reports and Documents.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isDeletingEvent}
                        onClick={() => setIsDeleteConfirmVisible(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isDeletingEvent}
                        onClick={() => void handleConfirmDelete()}
                      >
                        {isDeletingEvent ? 'Deleting...' : 'Confirm to delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            {editEvent && onDelete && (
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting || isDeletingEvent}
                onClick={() => setIsDeleteConfirmVisible(true)}
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isDeletingEvent}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isDeletingEvent}
            >
              {isSubmitting ? 'Saving...' : editEvent ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
