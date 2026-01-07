import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Image, FileText, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

interface ChatFileUploadProps {
  applicationId?: string;
  requiredDocs: { id: string; label: string; description?: string }[];
  onComplete: (files: UploadedFile[]) => void;
  onSkip?: () => void;
  disabled?: boolean;
}

export function ChatFileUpload({
  applicationId,
  requiredDocs,
  onComplete,
  onSkip,
  disabled = false,
}: ChatFileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const handleFileSelect = async (docId: string, file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, HEIC or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB');
      return;
    }

    setError(null);
    setUploading(docId);

    try {
      if (!isSupabaseConfigured()) {
        // Simulate upload for development
        await new Promise(resolve => setTimeout(resolve, 1500));
        const fakeUrl = URL.createObjectURL(file);
        const uploadedFile: UploadedFile = {
          id: `${docId}-${Date.now()}`,
          name: file.name,
          type: file.type,
          url: fakeUrl,
          uploadedAt: new Date(),
        };
        setUploadedFiles(prev => ({ ...prev, [docId]: uploadedFile }));
      } else {
        // Real upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${applicationId || 'temp'}/${docId}-${Date.now()}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('application-documents')
          .getPublicUrl(data.path);

        const uploadedFile: UploadedFile = {
          id: data.path,
          name: file.name,
          type: file.type,
          url: urlData.publicUrl,
          uploadedAt: new Date(),
        };

        setUploadedFiles(prev => ({ ...prev, [docId]: uploadedFile }));
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentDocId) {
      handleFileSelect(currentDocId, file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = (docId: string, capture?: 'environment' | 'user') => {
    setCurrentDocId(docId);
    if (fileInputRef.current) {
      // Set capture attribute for camera access
      if (capture) {
        fileInputRef.current.setAttribute('capture', capture);
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const removeFile = (docId: string) => {
    setUploadedFiles(prev => ({ ...prev, [docId]: null }));
  };

  const allDocsUploaded = requiredDocs.every(doc => uploadedFiles[doc.id]);

  const handleComplete = () => {
    const files = Object.values(uploadedFiles).filter((f): f is UploadedFile => f !== null);
    onComplete(files);
  };

  return (
    <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-200 flex-shrink-0 space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Document list */}
      <div className="space-y-3">
        {requiredDocs.map((doc) => {
          const uploaded = uploadedFiles[doc.id];
          const isUploading = uploading === doc.id;

          return (
            <div
              key={doc.id}
              className={cn(
                'rounded-xl border-2 p-4 transition-all',
                uploaded
                  ? 'border-green-200 bg-green-50'
                  : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {uploaded ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className={cn(
                      'font-medium text-sm',
                      uploaded ? 'text-green-800' : 'text-slate-700'
                    )}>
                      {doc.label}
                    </span>
                  </div>
                  {doc.description && !uploaded && (
                    <p className="text-xs text-slate-500 mt-1 ml-7">{doc.description}</p>
                  )}
                  {uploaded && (
                    <p className="text-xs text-green-600 mt-1 ml-7 truncate">
                      {uploaded.name}
                    </p>
                  )}
                </div>

                {/* Upload buttons or status */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                  ) : uploaded ? (
                    <button
                      onClick={() => removeFile(doc.id)}
                      className="p-1.5 rounded-full hover:bg-green-100 text-green-600 transition-colors"
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      {/* Camera button - opens rear camera on mobile */}
                      <button
                        onClick={() => triggerFileInput(doc.id, 'environment')}
                        disabled={disabled}
                        className="p-2.5 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                        title="Take photo"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                      {/* Gallery button */}
                      <button
                        onClick={() => triggerFileInput(doc.id)}
                        disabled={disabled}
                        className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Choose from gallery"
                      >
                        <Image className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={disabled || uploading !== null}
            className="flex-1"
          >
            Skip for now
          </Button>
        )}
        <Button
          onClick={handleComplete}
          disabled={disabled || !allDocsUploaded || uploading !== null}
          className={cn(
            'flex-1 bg-gradient-brand hover:opacity-90',
            !allDocsUploaded && 'opacity-50'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : allDocsUploaded ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Submit Documents
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload All Documents
            </>
          )}
        </Button>
      </div>

      {/* Help text */}
      <p className="text-xs text-center text-slate-500">
        Tap <Camera className="h-3 w-3 inline" /> to take a photo or <Image className="h-3 w-3 inline" /> to choose from gallery
      </p>
    </div>
  );
}
