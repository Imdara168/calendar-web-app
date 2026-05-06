"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  Scissors,
  Trash2,
  Upload,
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
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
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
  updateDocument,
  updateDocumentFolder,
} from "@/lib/api";
import type { DocumentFile, DocumentFolder } from "@/lib/types";
import { downloadStoredFile, openStoredFile } from "@/lib/file-utils";

type ClipboardState = {
  mode: "copy" | "cut";
  files: DocumentFile[];
  sourceFolderId?: string;
} | null;

interface FileRowProps {
  file: DocumentFile;
  isSelected: boolean;
  onToggleSelection: (id: number) => void;
  onDelete: (id: number) => void;
  onView: (url: string) => void;
  onDownload: (url: string, name: string) => void;
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
  isSelected,
  onToggleSelection,
  onDelete,
  onView,
  onDownload,
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
      className={[
        "group flex flex-col gap-3 overflow-hidden rounded-lg border p-4 transition-all sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-primary/50",
      ].join(" ")}
    >
      <div className="flex min-w-0 w-full flex-1 items-start gap-3 sm:w-auto sm:items-center sm:gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(file.id)}
          className="mt-1 shrink-0 sm:mt-0"
        />

        <div className="shrink-0 rounded-lg bg-muted p-2">{icon}</div>

        <div className="min-w-0 flex-1">
          <p
            className="max-w-[140px] truncate font-medium text-foreground min-[400px]:max-w-[200px] sm:max-w-none"
            title={file.name}
          >
            {file.name}
          </p>
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
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0 sm:flex-nowrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onView(file.url)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="View"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDownload(file.url, file.name)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(file.id)}
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function Documents() {
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
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [error, setError] = useState("");
  const [folderViewMode, setFolderViewMode] = useState<"card" | "flat">("flat");
  const [viewingFolder, setViewingFolder] = useState<DocumentFolder | null>(
    null,
  );
  const [clipboard, setClipboard] = useState<ClipboardState>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await getDocuments();
      setFolders(data.folders);
      setFiles(data.files);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

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
    }
  }, [folderToDelete, loadDocuments, viewingFolder]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const fileList = input.files;

      if (!fileList || fileList.length === 0) return;

      setError("");
      setIsUploading(true);

      try {
        for (const file of Array.from(fileList)) {
          const uploadedFile = await readFileAsDataUrl(file);
          await createDocument({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadedFile,
            folderName: viewingFolder?.id,
          });
        }

        await loadDocuments();
      } catch (uploadError) {
        setError(getApiErrorMessage(uploadError));
      } finally {
        input.value = "";
        setIsUploading(false);
      }
    },
    [loadDocuments, viewingFolder],
  );

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

  const handleDeleteFile = useCallback((fileId: number) => {
    setFileToDelete(fileId);
    setIsDeleteFileOpen(true);
  }, []);

  const confirmDeleteFile = useCallback(async () => {
    if (fileToDelete === null) return;

    setError("");

    try {
      await deleteDocument(fileToDelete);
      setSelectedFiles((prev) => prev.filter((id) => id !== fileToDelete));
      setClipboard((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.filter((file) => file.id !== fileToDelete),
            }
          : null,
      );
      setIsDeleteFileOpen(false);
      setFileToDelete(null);
      await loadDocuments();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  }, [fileToDelete, loadDocuments]);

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

  return (
    <div className="min-w-0 space-y-6">
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
                    No folders created yet.
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
                  Recent Files
                </h3>
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-sm font-medium text-primary">
                      {selectedFiles.length} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {files.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Upload className="mx-auto mb-4 h-12 w-12 opacity-20" />
                    <p>No files uploaded yet.</p>
                    <p className="text-sm">Upload files to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid min-w-0 gap-3">
                  {files.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      isSelected={selectedFiles.includes(file.id)}
                      onToggleSelection={toggleFileSelection}
                      onDelete={handleDeleteFile}
                      onView={handleViewFile}
                      onDownload={handleDownloadFile}
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
        <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col overflow-hidden">
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
                <p className="text-lg font-medium">Empty folder</p>
                <p className="text-sm">
                  This folder does not have any files yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 pr-2">
                {viewingFolderFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isSelected={selectedFiles.includes(file.id)}
                    onToggleSelection={toggleFileSelection}
                    onDelete={handleDeleteFile}
                    onView={handleViewFile}
                    onDownload={handleDownloadFile}
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

      <AlertDialog open={isDeleteFolderOpen} onOpenChange={setIsDeleteFolderOpen}>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteFolder()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteFileOpen} onOpenChange={setIsDeleteFileOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete File?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected file. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteFile()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
