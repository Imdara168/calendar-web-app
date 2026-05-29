"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  ClipboardPaste,
  Copy,
  Download,
  Eye,
  File,
  FileImage,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Trash2,
  Upload,
  User as UserIcon,
  Info,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createDocument,
  createDocumentFolder,
  deleteDocument,
  deleteDocumentFolder,
  getApiErrorMessage,
  getDocuments,
  getUsers,
  updateDocument,
  updateDocumentFolder,
} from "@/lib/api";
import type {
  DocumentFile,
  DocumentFolder,
  User,
} from "@/lib/types";
import { downloadStoredFile, openStoredFile } from "@/lib/file-utils";

type ClipboardState = {
  mode: "copy" | "cut";
  files: DocumentFile[];
  sourceFolderId?: string;
} | null;

interface StagedFile {
  id: string;
  file: globalThis.File;
  previewUrl: string;
  description: string;
  assignedToId?: number | null;
}

interface FileRowProps {
  file: DocumentFile;
  canManage: boolean;
  canReplace: boolean;
  showSelection: boolean;
  isSelected: boolean;
  onToggleSelection: (id: number) => void;
  onDelete: (file: DocumentFile) => void;
  onView: (url: string) => void;
  onDownload: (url: string, name: string) => void;
  onPreview: (file: DocumentFile) => void;
  onReplace: (fileId: number) => void;
  folderTitle?: string;
}

function readFileAsDataUrl(file: globalThis.File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }

      reject(new Error(`Failed to read ${file.name}`));
    };

    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function FileRow({
  file,
  canManage,
  canReplace,
  showSelection,
  isSelected,
  onToggleSelection,
  onDelete,
  onView,
  onDownload,
  onPreview,
  onReplace,
  folderTitle,
}: FileRowProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const icon = file.type.startsWith("image/") ? (
    <FileImage className="w-5 h-5 text-blue-500" />
  ) : (
    <File className="w-5 h-5 text-gray-500" />
  );

  return (
    <div
      onClick={() => {
        if (showSelection && canManage) {
          onToggleSelection(file.id);
        } else if (!showSelection) {
          onPreview(file);
        }
      }}
      className={[
        "group flex flex-col gap-3 overflow-hidden rounded-lg border p-4 transition-all sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        showSelection && canManage ? "cursor-pointer" : "",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-primary/50",
      ].join(" ")}
    >
      <div className="flex min-w-0 w-full flex-1 items-start gap-3 sm:w-auto sm:items-center sm:gap-4">
        {showSelection && canManage ? (
          <Checkbox
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={() => onToggleSelection(file.id)}
            className="mt-1 shrink-0 sm:mt-0"
          />
        ) : null}

        <div className="shrink-0 rounded-lg bg-muted p-2">{icon}</div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className="max-w-[140px] truncate font-medium text-foreground min-[400px]:max-w-[200px] sm:max-w-none"
              title={file.name}
            >
              {file.name}
            </p>
            <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              file.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
              file.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              {file.status || 'Pending'}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-3">
            {folderTitle && (
              <span className="flex min-w-0 max-w-full items-center gap-1">
                <Folder className="w-3 h-3" />
                <span
                  className="max-w-[80px] truncate sm:max-w-none"
                  title={folderTitle}
                >
                  {folderTitle}
                </span>
              </span>
            )}
            <span>{format(new Date(file.uploadedAt), "MMM d, yyyy p")}</span>
            <span>{formatSize(file.size)}</span>
          </div>
          
          {(file.description || file.assignedTo) && (
            <div className="mt-2 flex flex-wrap gap-3 border-t pt-2">
              {file.assignedTo && (
                <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary">
                  <UserIcon className="w-3 h-3" />
                  <span
                    className="truncate"
                    title={`Assigned to ${file.assignedTo.fullname || file.assignedTo.username}`}
                  >
                    Assigned to: {file.assignedTo.fullname || file.assignedTo.username}
                  </span>
                </div>
              )}
              {file.description && (
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span className="min-w-0 break-all italic line-clamp-1" title={file.description}>
                    {file.description}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0 sm:self-start sm:flex-nowrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onView(file.url);
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
            event.stopPropagation();
            onDownload(file.url, file.name);
          }}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>
        {canReplace ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onReplace(file.id);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Replace"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        ) : null}
        {canManage ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(file);
              }}
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
              disabled={showSelection}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

interface AssigneePickerProps {
  users: User[];
  value?: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

function AssigneePicker({
  users,
  value,
  onChange,
  disabled = false,
  placeholder = "Search users",
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const availableUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((candidate) => {
      const haystack = `${candidate.fullname} ${candidate.username}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, users]);

  const handleSelect = (nextValue: number | null) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  const selectedUser = useMemo(
    () => users.find((candidate) => candidate.id === value) ?? null,
    [users, value],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between overflow-hidden text-left text-sm font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedUser
              ? selectedUser.fullname || selectedUser.username
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-3" align="start">
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search user by name..."
            className="h-9"
          />
          <ScrollArea className="max-h-64">
            <div className="space-y-1 pr-2">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={[
                    "h-4 w-4 shrink-0",
                    value == null ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                />
                <span className="truncate">Unassigned</span>
              </button>
              {availableUsers.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No matching users found.
                </div>
              ) : (
                availableUsers.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => handleSelect(candidate.id)}
                    className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Check
                      className={[
                        "mt-0.5 h-4 w-4 shrink-0",
                        value === candidate.id ? "opacity-100" : "opacity-0",
                      ].join(" ")}
                    />
                    <div className="min-w-0">
                      <p className="truncate">
                        {candidate.fullname || candidate.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{candidate.username}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DocumentsProps {
  user: User;
}

function normalizeDocumentStatus(status?: string | null) {
  if (status === "Completed" || status === "In Progress") {
    return status;
  }

  return "Pending";
}

export function Documents({ user }: DocumentsProps) {
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<DocumentFolder | null>(
    null,
  );
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleteFileOpen, setIsDeleteFileOpen] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<DocumentFile[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [folderViewMode, setFolderViewMode] = useState<"card" | "flat">("flat");
  const [viewingFolder, setViewingFolder] = useState<DocumentFolder | null>(
    null,
  );
  const [clipboard, setClipboard] = useState<ClipboardState>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isStagedModalOpen, setIsStagedModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [editedAssignmentId, setEditedAssignmentId] = useState<number | null>(null);
  const [editedStatus, setEditedStatus] = useState("Pending");
  const [hasUnsavedMetadataDraft, setHasUnsavedMetadataDraft] = useState(false);
  const [replacingFileId, setReplacingFileId] = useState<number | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async (query?: string) => {
    try {
      if (query !== undefined) setIsSearching(true);
      const data = await getDocuments(query);
      setFolders(data.folders);
      setFiles(data.files);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, []);

  const handleSaveMetadata = useCallback(async () => {
    if (!previewFile) return;
    
    setError("");
    const payload = {
      description: editedDescription,
      assignedToId: editedAssignmentId,
      status: normalizeDocumentStatus(editedStatus),
    };
    console.log("[Documents] Saving metadata payload", {
      fileId: previewFile.id,
      currentAssignedToId: previewFile.assignedTo?.id ?? null,
      currentStatus: previewFile.status,
      draftAssignedToId: editedAssignmentId,
      draftStatus: editedStatus,
      draftDescription: editedDescription,
      payload,
    });

    try {
      const updated = await updateDocument(previewFile.id, payload);
      console.log("[Documents] Save metadata response", {
        fileId: updated.id,
        savedAssignedToId: updated.assignedTo?.id ?? null,
        savedStatus: updated.status,
        savedDescription: updated.description ?? "",
        ownerId: updated.ownerId ?? null,
      });

      setFiles(prev => prev.map(f => f.id === previewFile.id ? updated : f));
      setEditedAssignmentId(updated.assignedTo?.id ?? null);
      setEditedStatus(normalizeDocumentStatus(updated.status));
      setEditedDescription(updated.description || "");
      setHasUnsavedMetadataDraft(false);
      setIsEditingDescription(false);
      setPreviewFile(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [editedAssignmentId, editedDescription, editedStatus, previewFile]);

  const handleDraftAssignmentChange = useCallback((assignedToId: number | null) => {
    console.log("[Documents] Draft assignee changed", {
      fileId: previewFile?.id ?? null,
      currentAssignedToId: previewFile?.assignedTo?.id ?? null,
      nextAssignedToId: assignedToId,
    });
    setEditedAssignmentId(assignedToId);
    setHasUnsavedMetadataDraft(true);
  }, [previewFile]);

  const handleDraftStatusChange = useCallback((status: string) => {
    console.log("[Documents] Draft status changed", {
      fileId: previewFile?.id ?? null,
      currentStatus: normalizeDocumentStatus(previewFile?.status),
      nextStatus: normalizeDocumentStatus(status),
    });
    setEditedStatus(normalizeDocumentStatus(status));
    setHasUnsavedMetadataDraft(true);
  }, [previewFile]);

  const resetMetadataDraft = useCallback(() => {
    setEditedAssignmentId(previewFile?.assignedTo?.id ?? null);
    setEditedStatus(normalizeDocumentStatus(previewFile?.status));
    setEditedDescription(previewFile?.description || "");
    setHasUnsavedMetadataDraft(false);
    setIsEditingDescription(false);
    setPreviewFile(null);
  }, [previewFile]);

  const startEditingDescription = () => {
    if (!previewFile) return;
    setEditedDescription(previewFile.description || "");
    setIsEditingDescription(true);
  };

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (loadError) {
      console.error("Failed to load users:", loadError);
    }
  }, []);

  const handleTriggerReplace = (fileId: number) => {
    setReplacingFileId(fileId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.click();
    }
  };

  const handleFileReplacement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingFileId === null) return;

    setError("");
    setIsUploading(true);

    try {
      const uploadedFile = await readFileAsDataUrl(file);
      const updated = await updateDocument(replacingFileId, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedFile,
      });

      setFiles((prev) => prev.map((f) => (f.id === replacingFileId ? updated : f)));
      if (previewFile?.id === replacingFileId) {
        setPreviewFile(updated);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
      setReplacingFileId(null);
      if (e.target) e.target.value = "";
    }
  };

  useEffect(() => {
    void loadDocuments();
    void loadUsers();
  }, [loadDocuments, loadUsers]);

  useEffect(() => {
    setIsEditingDescription(false);
    setEditedDescription(previewFile?.description || "");
    setEditedAssignmentId(previewFile?.assignedTo?.id ?? null);
    setEditedStatus(normalizeDocumentStatus(previewFile?.status));
    setHasUnsavedMetadataDraft(false);
  }, [previewFile]);

  const handleSearch = useCallback(() => {
    void loadDocuments(searchQuery);
  }, [loadDocuments, searchQuery]);

  const selectedFileObjects = useMemo(
    () => files.filter((file) => selectedFiles.includes(file.id)),
    [files, selectedFiles],
  );

  const viewingFolderFiles = useMemo(
    () =>
      viewingFolder
        ? files.filter((file) => file.folderId === viewingFolder.id)
        : [],
    [files, viewingFolder],
  );

  const clipboardLabel = useMemo(() => {
    if (!clipboard) return "";
    return `${clipboard.files.length} ${clipboard.files.length === 1 ? "file" : "files"} ready to ${clipboard.mode === "copy" ? "copy" : "move"}`;
  }, [clipboard]);

  const resetFolderDialogs = () => {
    setNewFolderName("");
    setRenameFolderName("");
    setFolderToRename(null);
    setIsFolderModalOpen(false);
    setIsRenameFolderOpen(false);
  };

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    setError("");
    setIsSavingFolder(true);

    try {
      await createDocumentFolder(newFolderName.trim());
      resetFolderDialogs();
      await loadDocuments();
    } catch (createError) {
      setError(getApiErrorMessage(createError));
    } finally {
      setIsSavingFolder(false);
    }
  }, [loadDocuments, newFolderName]);

  const openRenameFolder = (folder: DocumentFolder) => {
    setFolderToRename(folder);
    setRenameFolderName(folder.title);
    setIsRenameFolderOpen(true);
  };

  const handleRenameFolder = useCallback(async () => {
    if (!folderToRename || !renameFolderName.trim()) return;

    setError("");
    setIsSavingFolder(true);

    try {
      const updatedFolder = await updateDocumentFolder(
        folderToRename.id,
        renameFolderName.trim(),
      );
      if (viewingFolder?.id === folderToRename.id) {
        setViewingFolder(updatedFolder);
      }
      resetFolderDialogs();
      await loadDocuments();
    } catch (renameError) {
      setError(getApiErrorMessage(renameError));
    } finally {
      setIsSavingFolder(false);
    }
  }, [folderToRename, loadDocuments, renameFolderName, viewingFolder]);

  const handleDeleteFolder = useCallback(
    (folderId: string, folderTitle: string) => {
      setFolderToDelete({ id: folderId, title: folderTitle });
      setIsDeleteFolderOpen(true);
    },
    [],
  );

  const confirmDeleteFolder = useCallback(async () => {
    if (!folderToDelete) return;

    setError("");
    setIsDeletingFolder(true);

    try {
      await deleteDocumentFolder(folderToDelete.id);
      if (viewingFolder?.id === folderToDelete.id) {
        setViewingFolder(null);
      }
      setIsDeleteFolderOpen(false);
      setFolderToDelete(null);
      await loadDocuments();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setIsDeletingFolder(false);
    }
  }, [folderToDelete, loadDocuments, viewingFolder]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const fileList = input.files;

      if (!fileList || fileList.length === 0) return;

      const newStagedFiles: StagedFile[] = [];

      for (const file of Array.from(fileList)) {
        const previewUrl = file.type.startsWith("image/")
          ? await readFileAsDataUrl(file)
          : "";
        
        newStagedFiles.push({
          id: Math.random().toString(36).substring(7),
          file,
          previewUrl,
          description: "",
        });
      }

      setStagedFiles((prev) => [...prev, ...newStagedFiles]);
      setIsStagedModalOpen(true);
      input.value = "";
    },
    [],
  );

  const handleUpdateStagedFile = (id: string, updates: Partial<StagedFile>) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    if (stagedFiles.length === 1) {
      setIsStagedModalOpen(false);
    }
  };

  const handleConfirmUpload = useCallback(async () => {
    if (stagedFiles.length === 0) return;

    setError("");
    setIsUploading(true);

    try {
      for (const staged of stagedFiles) {
        const uploadedFile = await readFileAsDataUrl(staged.file);
        await createDocument({
          fileName: staged.file.name,
          fileType: staged.file.type,
          fileSize: staged.file.size,
          uploadedFile,
          folderName: viewingFolder?.id,
          description: staged.description,
          assignedToId: staged.assignedToId,
        });
      }

      setStagedFiles([]);
      setIsStagedModalOpen(false);
      await loadDocuments();
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  }, [loadDocuments, stagedFiles, viewingFolder]);

  const toggleFileSelection = (fileId: number) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedFiles([]);
      }

      return !prev;
    });
  };

  const handleMoveSelectedFiles = useCallback(
    async (folderId: string) => {
      if (selectedFiles.length === 0) return;

      setError("");
      setIsOrganizing(true);

      try {
        await Promise.all(
          selectedFiles.map((fileId) =>
            updateDocument(fileId, { folderName: folderId }),
          ),
        );
        clearSelection();
        await loadDocuments();
      } catch (moveError) {
        setError(getApiErrorMessage(moveError));
      } finally {
        setIsOrganizing(false);
      }
    },
    [loadDocuments, selectedFiles],
  );

  const handleDeleteFile = useCallback((file: DocumentFile) => {
    setFilesToDelete([file]);
    setIsDeleteFileOpen(true);
  }, []);

  const handleDeleteSelectedFiles = useCallback(() => {
    if (selectedFileObjects.length === 0) return;

    setFilesToDelete(selectedFileObjects);
    setIsDeleteFileOpen(true);
  }, [selectedFileObjects]);

  const confirmDeleteFile = useCallback(async () => {
    if (filesToDelete.length === 0) return;

    setError("");
    setIsDeletingFile(true);

    try {
      await Promise.all(filesToDelete.map((file) => deleteDocument(file.id)));
      const deletedIds = new Set(filesToDelete.map((file) => file.id));
      setClipboard((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.filter((file) => !deletedIds.has(file.id)),
            }
          : null,
      );
      setSelectedFiles((prev) => prev.filter((id) => !deletedIds.has(id)));
      if (selectedFiles.length === deletedIds.size) {
        setIsSelectionMode(false);
      }
      setIsDeleteFileOpen(false);
      setFilesToDelete([]);
      await loadDocuments();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setIsDeletingFile(false);
    }
  }, [filesToDelete, loadDocuments, selectedFiles.length]);

  const handleViewFile = (url: string) => {
    try {
      openStoredFile(url);
    } catch (previewError) {
      setError(getApiErrorMessage(previewError));
    }
  };

  const handleDownloadFile = (url: string, name: string) => {
    try {
      downloadStoredFile(url, name);
    } catch (downloadError) {
      setError(getApiErrorMessage(downloadError));
    }
  };

  const handleCopySelected = () => {
    if (selectedFileObjects.length === 0) return;

    setClipboard({
      mode: "copy",
      files: selectedFileObjects,
      sourceFolderId: viewingFolder?.id,
    });
  };

  const handleCutSelected = () => {
    if (selectedFileObjects.length === 0) return;

    setClipboard({
      mode: "cut",
      files: selectedFileObjects,
      sourceFolderId: viewingFolder?.id,
    });
  };

  const handlePasteIntoFolder = useCallback(
    async (targetFolder: DocumentFolder) => {
      if (!clipboard || clipboard.files.length === 0) return;

      // Filter out files that are already in this folder to prevent duplicates
      const filesToProcess = clipboard.files.filter(
        (file) => file.folderId !== targetFolder.id,
      );

      if (filesToProcess.length === 0) {
        setError("Selected files are already in this folder.");
        return;
      }

      setError("");
      setIsOrganizing(true);

      try {
        if (clipboard.mode === "copy") {
          await Promise.all(
            filesToProcess.map((file) =>
              createDocument({
                folderName: targetFolder.id,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileUrl: file.url,
                date: file.date,
              }),
            ),
          );
        } else {
          await Promise.all(
            filesToProcess.map((file) =>
              updateDocument(file.id, { folderName: targetFolder.id }),
            ),
          );
        }

        // Clear clipboard and selection after a successful paste
        setClipboard(null);
        setSelectedFiles((prev) =>
          prev.filter(
            (fileId) => !filesToProcess.some((file) => file.id === fileId),
          ),
        );

        if (viewingFolder?.id === targetFolder.id) {
          setViewingFolder(targetFolder);
        }

        await loadDocuments();
      } catch (pasteError) {
        setError(getApiErrorMessage(pasteError));
      } finally {
        setIsOrganizing(false);
      }
    },
    [clipboard, loadDocuments, viewingFolder],
  );

  const canPasteIntoFolder = (folderId: string) => {
    if (!clipboard || clipboard.files.length === 0) {
      return false;
    }

    // Prevent pasting back into the exact same folder they were copied/cut from
    if (clipboard.sourceFolderId === folderId) {
      return false;
    }

    // Check if ALL files in the clipboard already belong to this target folder
    // (This handles cases where files were selected from the 'Recent Files' list)
    const allFilesAlreadyInTarget = clipboard.files.every(
      (file) => file.folderId === folderId,
    );

    if (allFilesAlreadyInTarget) {
      return false;
    }

    return true;
  };

  const renderFolderActions = (folder: DocumentFolder, compact = false) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={`${compact ? "h-8 w-8" : "h-7 w-7"} text-muted-foreground hover:text-foreground`}
        onClick={(e) => {
          e.stopPropagation();
          openRenameFolder(folder);
        }}
        title="Rename folder"
      >
        <Pencil className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`${compact ? "h-8 w-8" : "h-7 w-7"} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}
        onClick={(e) => {
          e.stopPropagation();
          void handleDeleteFolder(folder.id, folder.title);
        }}
        title="Delete folder"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

  const deleteFilesLabel =
    selectedFileObjects.length > 1 ? "Delete All" : "Delete";
  const isBulkDelete = filesToDelete.length > 1;
  const canEditDocumentFile = useCallback(
    (file: Pick<DocumentFile, "assignedTo" | "workflowOwnerId" | "ownerId"> | null) => {
      if (!file) {
        return false;
      }

      const effectiveWorkflowOwnerId =
        file.workflowOwnerId ?? file.assignedTo?.id ?? file.ownerId ?? null;

      return effectiveWorkflowOwnerId === user.id || file.assignedTo?.id === user.id;
    },
    [user.id],
  );
  const canManagePreview =
    previewFile != null && previewFile.ownerId === user.id;
  const canEditSharedPreview = canEditDocumentFile(previewFile);

  return (
    <div className="min-w-0 space-y-6">
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleFileReplacement}
        className="hidden"
      />
      <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground">Documents</h2>
          <p className="text-muted-foreground">
            Manage folders and files workspace
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsFolderModalOpen(true)}
            disabled={isSavingFolder}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <div className="relative">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <Button disabled={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Searching files or folders"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching}
          className="shrink-0"
        >
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {clipboard && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {clipboard.mode === "copy"
                ? "Copy clipboard active"
                : "Cut clipboard active"}
            </p>
            <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {clipboardLabel}. Open another folder and press Paste.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setClipboard(null)}>
            Clear Clipboard
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6">
            <section className="min-w-0 overflow-hidden">
              <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h3 className="min-w-0 flex items-center gap-2 text-lg font-semibold">
                  <Folder className="w-5 h-5 text-foreground" />
                  Folders
                </h3>
                <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
                  <Button
                    variant={folderViewMode === "card" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFolderViewMode("card")}
                    className="h-8 w-8 p-0"
                    title="Card view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={folderViewMode === "flat" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFolderViewMode("flat")}
                    className="h-8 w-8 p-0"
                    title="Flat view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {folders.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {searchQuery ? "No matching folders found." : "No folders created yet."}
                  </CardContent>
                </Card>
              ) : (
                <div
                  className={
                    folderViewMode === "card"
                      ? "grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]"
                      : "grid min-w-0 gap-3"
                  }
                >
                  {folders.map((folder) => {
                    const pasteEnabled = canPasteIntoFolder(folder.id);

                    if (folderViewMode === "card") {
                      return (
                        <Card
                          key={folder.id}
                          className="group relative min-w-0 cursor-pointer overflow-hidden border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
                          onClick={() => setViewingFolder(folder)}
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <div className="rounded-2xl border border-border bg-muted px-4 py-3 shadow-sm">
                                <Folder className="h-7 w-7 text-foreground" />
                              </div>
                              <div className="flex items-center gap-1">
                                {renderFolderActions(folder)}
                              </div>
                            </div>
                            <CardTitle
                              className="max-w-[140px] truncate text-base font-semibold min-[400px]:max-w-[200px] sm:max-w-none"
                              title={folder.title}
                            >
                              {folder.title}
                            </CardTitle>
                            <CardDescription>
                              {folder.fileCount ?? 0}{" "}
                              {(folder.fileCount ?? 0) === 1 ? "file" : "files"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 p-4 pt-0">
                            <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                              Click anywhere to open this folder
                            </div>
                            {selectedFiles.length > 0 && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full justify-start"
                                disabled={isOrganizing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleMoveSelectedFiles(folder.id);
                                }}
                              >
                                Move selected files here
                              </Button>
                            )}
                            {pasteEnabled && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                disabled={isOrganizing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handlePasteIntoFolder(folder);
                                }}
                              >
                                <ClipboardPaste className="w-4 h-4 mr-2" />
                                Paste{" "}
                                {clipboard?.mode === "copy"
                                  ? "copied"
                                  : "cut"}{" "}
                                files here
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <div
                        key={folder.id}
                        className="group min-w-0 overflow-hidden rounded-xl border border-border bg-background px-4 py-3 transition-all hover:border-primary/50 hover:bg-primary/5"
                        onClick={() => setViewingFolder(folder)}
                      >
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                            <div className="shrink-0 rounded-xl border border-border bg-muted px-3 py-2 shadow-sm">
                              <Folder className="w-6 h-6 text-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="max-w-[140px] truncate font-semibold text-foreground min-[400px]:max-w-[200px] sm:max-w-none"
                                title={folder.title}
                              >
                                {folder.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {folder.fileCount ?? 0}{" "}
                                {(folder.fileCount ?? 0) === 1
                                  ? "file"
                                  : "files"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center justify-end gap-2">
                            {renderFolderActions(folder, true)}
                          </div>
                        </div>
                        {(pasteEnabled || selectedFiles.length > 0) && (
                          <div className="flex flex-wrap justify-end gap-2 pt-1">
                            {pasteEnabled && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isOrganizing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handlePasteIntoFolder(folder);
                                }}
                              >
                                <ClipboardPaste className="w-4 h-4 mr-2" />
                                Paste
                              </Button>
                            )}
                            {selectedFiles.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isOrganizing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleMoveSelectedFiles(folder.id);
                                }}
                              >
                                Move Here
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="min-w-0 overflow-hidden">
              <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h3 className="min-w-0 flex items-center gap-2 text-lg font-semibold">
                  <File className="w-5 h-5 text-primary" />
                  {searchQuery ? "Search Results" : "Recent Files"}
                </h3>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isSelectionMode && selectedFiles.length > 0 && (
                    <span className="text-sm font-medium text-primary">
                      {selectedFiles.length} selected
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleSelectionMode}
                  >
                    {isSelectionMode ? "Cancel" : "Select"}
                  </Button>
                </div>
              </div>

              {files.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Upload className="mx-auto mb-4 h-12 w-12 opacity-20" />
                    <p>{searchQuery ? "No matching files found." : "No files uploaded yet."}</p>
                    <p className="text-sm">{searchQuery ? "Try a different search term." : "Upload files to get started."}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid min-w-0 gap-3">
                  {files.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      canManage={file.ownerId === user.id}
                      canReplace={canEditDocumentFile(file)}
                      showSelection={isSelectionMode}
                      isSelected={selectedFiles.includes(file.id)}
                      onToggleSelection={toggleFileSelection}
                      onDelete={handleDeleteFile}
                      onView={handleViewFile}
                      onDownload={handleDownloadFile}
                      onPreview={setPreviewFile}
                      onReplace={handleTriggerReplace}
                      folderTitle={
                        folders.find((folder) => folder.id === file.folderId)
                          ?.title
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="min-w-0 space-y-4">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsFolderModalOpen(true)}
                  disabled={isSavingFolder}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Folder
                </Button>
                <div className="relative w-full">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Files"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {selectedFiles.length > 0 && (
              <Card className="min-w-0 overflow-hidden border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Selected Files
                  </CardTitle>
                  <CardDescription>
                    {selectedFiles.length} ready for organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={handleDeleteSelectedFiles}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteFilesLabel}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleCopySelected}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Selected
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleCutSelected}
                  >
                    <Scissors className="w-4 h-4 mr-2" />
                    Cut Selected
                  </Button>
                  {folders.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                      No folders available
                    </p>
                  ) : (
                    folders.map((folder) => (
                      <Button
                        key={folder.id}
                        variant="ghost"
                        size="sm"
                        disabled={isOrganizing}
                        className="w-full justify-start overflow-hidden text-xs"
                        title={`Move to ${folder.title}`}
                        onClick={() => void handleMoveSelectedFiles(folder.id)}
                      >
                        <Folder className="w-3 h-3 mr-2" />
                        <span className="truncate">Move to {folder.title}</span>
                      </Button>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={!!viewingFolder}
        onOpenChange={(open) => !open && setViewingFolder(null)}
        modal={false}
      >
        <DialogContent className="flex max-h-[88vh] sm:max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="rounded-xl border border-border bg-muted px-3 py-2 shadow-sm">
                    <Folder className="w-6 h-6 text-foreground" />
                  </div>
                  <span className="truncate" title={viewingFolder?.title}>
                    {viewingFolder?.title}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {viewingFolderFiles.length}{" "}
                  {viewingFolderFiles.length === 1 ? "file" : "files"} in this
                  folder
                </DialogDescription>
              </div>
              <div className="flex flex-nowrap items-center gap-2 pr-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectionMode}
                >
                  {isSelectionMode ? "Cancel" : "Select"}
                </Button>
                {selectedFileObjects.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySelected}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCutSelected}
                    >
                      <Scissors className="w-4 h-4 mr-2" />
                      Cut
                    </Button>
                  </>
                )}
                {viewingFolder && canPasteIntoFolder(viewingFolder.id) && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isOrganizing}
                    onClick={() => void handlePasteIntoFolder(viewingFolder)}
                  >
                    <ClipboardPaste className="w-4 h-4 mr-2" />
                    Paste Here
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {clipboard && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">
              {clipboardLabel}
            </div>
          )}

          <div className="min-h-[320px] flex-1 overflow-y-auto py-4">
            {viewingFolderFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 py-20 text-muted-foreground">
                <Folder className="mb-4 h-12 w-12 opacity-20" />
                <p className="text-lg font-medium">
                  {searchQuery ? "No matching files" : "Empty folder"}
                </p>
                <p className="text-sm">
                  {searchQuery ? "Try a different search term." : "This folder does not have any files yet."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 pr-2">
                {viewingFolderFiles.map((file) => (
                    <FileRow
                    key={file.id}
                    file={file}
                    canManage={file.ownerId === user.id}
                    canReplace={canEditDocumentFile(file)}
                    showSelection={isSelectionMode}
                    isSelected={selectedFiles.includes(file.id)}
                    onToggleSelection={toggleFileSelection}
                    onDelete={handleDeleteFile}
                    onView={handleViewFile}
                    onDownload={handleDownloadFile}
                    onPreview={setPreviewFile}
                    onReplace={handleTriggerReplace}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2 border-t pt-4 sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedFileObjects.length > 0
                ? `${selectedFileObjects.length} selected in this workspace`
                : "Select files to copy or cut"}
            </div>
            <Button variant="outline" onClick={() => setViewingFolder(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen} modal={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g. Project Assets"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreateFolder()}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetFolderDialogs}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateFolder()}
              disabled={isSavingFolder}
            >
              {isSavingFolder ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen} modal={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Choose a clearer folder name without changing the files inside it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-folder-name">Folder Name</Label>
            <Input
              id="rename-folder-name"
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleRenameFolder()}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameFolderOpen(false);
                setFolderToRename(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleRenameFolder()}
              disabled={isSavingFolder}
            >
              {isSavingFolder ? "Saving..." : "Save Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteFolderOpen}
        onOpenChange={(open) => {
          setIsDeleteFolderOpen(open);
          if (!open && !isDeletingFolder) {
            setFolderToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Folder?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the folder{" "}
              <span className="font-semibold text-foreground">
                "{folderToDelete?.title}"
              </span>
              ?
              <br />
              <br />
              All files inside this folder will be kept, but they will become{" "}
              <span className="font-medium text-foreground underline decoration-destructive/30">
                unassigned
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFolder}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => void confirmDeleteFolder()}
              variant="destructive"
              disabled={isDeletingFolder}
            >
              {isDeletingFolder ? "Deleting..." : "Confirm to delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteFileOpen}
        onOpenChange={(open) => {
          setIsDeleteFileOpen(open);
          if (!open && !isDeletingFile) {
            setFilesToDelete([]);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {isBulkDelete ? "Delete Files?" : "Delete File?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBulkDelete ? (
                <>Are you sure you want to delete these {filesToDelete.length} files?</>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">
                    "{filesToDelete[0]?.name}"
                  </span>{" "}
                  ?
                </>
              )}
              <br />
              <br />
              This will remove {isBulkDelete ? "them" : "it"} everywhere, including all linked event
              attachments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFile}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => void confirmDeleteFile()}
              variant="destructive"
              disabled={isDeletingFile}
            >
              {isDeletingFile ? "Deleting..." : "Confirm to delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog 
        open={isStagedModalOpen} 
        onOpenChange={(open) => {
          setIsStagedModalOpen(open);
          if (!open) setStagedFiles([]);
        }} 
        modal={false}
      >
        <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="relative z-30 shrink-0 border-b bg-background p-6 pr-12 text-left">
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Review your files and add descriptions or assignments before uploading.
            </DialogDescription>
            <div className="absolute right-12 top-6">
              <input
                type="file"
                multiple
                id="add-more-staged-files"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => document.getElementById('add-more-staged-files')?.click()}
                title="Add more files"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative z-10 p-6 pb-12">
            <div className="grid gap-6">
              {stagedFiles.map((staged) => (
                <div key={staged.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-muted/30 w-full overflow-hidden">
                  <div className="w-full md:w-32 h-32 shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center border">
                    {staged.previewUrl ? (
                      <img src={staged.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <File className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold">{staged.file.name.split('.').pop()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm" title={staged.file.name}>{staged.file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(staged.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveStagedFile(staged.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                      <div className="space-y-1.5 min-w-0">
                        <Label htmlFor={`assign-${staged.id}`} className="text-[10px] uppercase font-bold text-muted-foreground">Assign to</Label>
                        <div id={`assign-${staged.id}`}>
                          <AssigneePicker
                            users={users}
                            value={staged.assignedToId ?? null}
                            onChange={(assignedToId) =>
                              handleUpdateStagedFile(staged.id, { assignedToId })
                            }
                            placeholder="Search users"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <Label htmlFor={`desc-${staged.id}`} className="text-[10px] uppercase font-bold text-muted-foreground">Description</Label>
                        <Textarea
                          id={`desc-${staged.id}`}
                          placeholder="Add description..."
                          className="min-h-[60px] text-xs resize-none"
                          value={staged.description}
                          onChange={(e) => handleUpdateStagedFile(staged.id, { description: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 z-30 shrink-0 border-t bg-background p-6">
            <Button variant="outline" onClick={() => {
              setStagedFiles([]);
              setIsStagedModalOpen(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmUpload} 
              disabled={isUploading || stagedFiles.length === 0}
            >
              {isUploading ? "Uploading..." : `Upload ${stagedFiles.length} ${stagedFiles.length === 1 ? 'File' : 'Files'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)} modal={false}>
        <DialogContent className="flex max-h-[90vh] min-h-0 flex-col overflow-hidden p-0 sm:max-w-2xl gap-0">
          <DialogHeader className="relative z-30 shrink-0 border-b bg-background p-6 pr-12 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="flex min-w-0 items-center gap-2">
                  <File className="w-5 h-5 shrink-0 text-primary" />
                  <span className="truncate">{previewFile?.name}</span>
                </DialogTitle>
                <DialogDescription>
                  File Details & Preview
                </DialogDescription>
              </div>
              <div className="w-full sm:w-auto sm:shrink-0">
                {canEditSharedPreview ? (
                  <Select
                    value={editedStatus}
                    onValueChange={handleDraftStatusChange}
                  >
                    <SelectTrigger
                      className={`h-8 w-full text-[10px] font-bold uppercase sm:w-[130px] ${
                        editedStatus === "Completed"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : editedStatus === "In Progress"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
                            : "border-blue-500/20 bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div
                    className={`inline-flex h-8 items-center rounded-md border px-3 text-[10px] font-bold uppercase ${
                      previewFile?.status === "Completed"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                        : previewFile?.status === "In Progress"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
                          : "border-blue-500/20 bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {previewFile?.status || "Pending"}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative z-10">
            <div className="space-y-6 p-6 pb-12">
              <div className="flex min-h-[160px] max-h-[24vh] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/70 p-4">
                {previewFile?.type.startsWith('image/') ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground opacity-40">
                    <File className="w-14 h-14" />
                    <p className="text-sm font-medium uppercase tracking-widest">{previewFile?.type.split('/').pop()}</p>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Size</Label>
                  <p className="text-sm font-medium">{previewFile ? (previewFile.size / 1024).toFixed(1) + ' KB' : '-'}</p>
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Uploaded At</Label>
                  <p className="text-sm font-medium">
                    {previewFile ? format(new Date(previewFile.uploadedAt), "MMM d, yyyy p") : "-"}
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Assigned To
                  </Label>
                  <div className="mt-1">
                    {canEditSharedPreview && previewFile ? (
                      <AssigneePicker
                        users={users}
                        value={editedAssignmentId}
                        onChange={handleDraftAssignmentChange}
                        placeholder="Search users"
                      />
                    ) : (
                      <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <UserIcon className="w-3 h-3 text-primary" />
                        </div>
                        <p className="min-w-0 truncate text-sm font-medium">
                          {previewFile?.assignedTo?.fullname ||
                            previewFile?.assignedTo?.username ||
                            "Unassigned"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                  {canEditSharedPreview && !isEditingDescription && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingDescription}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {canEditSharedPreview && isEditingDescription ? (
                  <div className="min-w-0 space-y-2">
                    <Textarea
                      className="block h-[120px] max-h-[120px] w-full min-w-0 max-w-full [field-sizing:fixed] overflow-y-auto overflow-x-hidden text-sm resize-none break-all [overflow-wrap:anywhere] whitespace-pre-wrap"
                      value={editedDescription}
                      onChange={(e) => {
                        setEditedDescription(e.target.value);
                        setHasUnsavedMetadataDraft(true);
                      }}
                      placeholder="Add a description..."
                    />
                  </div>
                ) : (
                  <div className="h-[120px] w-full min-w-0 max-w-full overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                      {previewFile?.description || "No description provided."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {canEditSharedPreview && (
            <DialogFooter className="sticky bottom-0 z-30 shrink-0 border-t bg-background p-6">
              <div className="flex w-full items-center justify-between gap-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {hasUnsavedMetadataDraft ? "Unsaved Changes" : "Document Settings"}
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={resetMetadataDraft}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveMetadata}
                    disabled={!hasUnsavedMetadataDraft}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
