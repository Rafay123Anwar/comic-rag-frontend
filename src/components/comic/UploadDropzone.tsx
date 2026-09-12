import axios from 'axios';
import { BookOpen, CloudUpload, File, Library, X } from 'lucide-react';
import {
  type DragEvent,
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadComic } from '../../services/comicApi';
import { useComicStore } from '../../stores/comicStore';
import { getErrorMessage } from '../../utils/errors';
import { formatFileSize } from '../../utils/formatting';
import { saveComicToLibrary } from '../../utils/storage';
import { Spinner } from '../common/Spinner';
import { useToast } from '../common/Toast';

const ACCEPTED_FORMATS = ['.cbr', '.cbz', '.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Comic-themed analysis messages shown while backend analyzes pages.
 */
const ANALYSIS_MESSAGES = [
  'Analyzing comic pages…',
  'Extracting panels and dialogue…',
  'Building your comic knowledge base…',
  'Reading character relationships…',
  'Indexing story elements…',
  'Large comics can take a few minutes…',
  'Almost there — finishing analysis…',
];

const MESSAGE_CYCLE_MS = 3_500;

interface UploadDropzoneProps {
  onSuccess?: (comicId: string) => void;
  compact?: boolean;
}

export function UploadDropzone({ onSuccess, compact = false }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100% byte transfer
  const [analyzing, setAnalyzing] = useState(false); // Phase 2: AI analysis
  const [analysisMessageIdx, setAnalysisMessageIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const addComic = useComicStore((state) => state.addComic);
  const toast = useToast();

  useEffect(() => {
    if (!analyzing) return;
    const interval = setInterval(() => {
      setAnalysisMessageIdx((idx) => (idx + 1) % ANALYSIS_MESSAGES.length);
    }, MESSAGE_CYCLE_MS);
    return () => clearInterval(interval);
  }, [analyzing]);

  const isValidFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_FORMATS.includes(ext);
  };

  const handleFile = (file: File) => {
    if (uploading) return;
    setError(null);
    setIsTimeoutError(false);
    if (!isValidFile(file)) {
      setError(`Unsupported format. Accepted: ${ACCEPTED_FORMATS.join(', ')}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatFileSize(file.size)}) exceeds the maximum allowed limit of ${MAX_FILE_SIZE_MB} MB. Please select a smaller file.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      if (uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploading]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!uploading) setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setError(null);
    setIsTimeoutError(false);
    setUploadProgress(0);
    setAnalyzing(false);
    setAnalysisMessageIdx(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await uploadComic(
        selectedFile,
        (pct) => {
          setUploadProgress(pct);
          if (pct >= 100) {
            setAnalyzing(true);
          }
        },
        controller.signal
      );

      const entry = {
        comic_id: result.comic_id,
        title: selectedFile.name.replace(/\.[^.]+$/, ''),
        total_pages: result.total_pages,
        source_format: result.format.replace('.', ''),
        uploaded_at: new Date().toISOString(),
      };

      addComic(entry);
      saveComicToLibrary(entry);

      toast.success(`"${entry.title}" added to vault!`);
      onSuccess?.(result.comic_id);
      navigate(`/comics/${result.comic_id}`);
    } catch (err) {
      if (axios.isCancel(err)) return;

      // Abort any in-flight requests / controllers
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const isTimeout =
        axios.isAxiosError(err) &&
        !err.response &&
        ['ECONNABORTED', 'ETIMEDOUT'].includes((err.code ?? '').toUpperCase());

      const is500 = axios.isAxiosError(err) && err.response?.status === 500;

      let msg = getErrorMessage(err, { isUploadTimeout: isTimeout });
      if (is500) {
        const detail = err.response?.data?.detail;
        const detailStr = typeof detail === 'string' ? detail : (detail?.msg || detail?.message);
        msg = detailStr
          ? `Server error (500): ${detailStr}. Please try again.`
          : 'Server error (500): The server encountered an issue while analyzing the comic. Please try again.';
      }

      setError(msg);
      setIsTimeoutError(isTimeout);

      // Explicitly notify user via toast
      toast.error(msg);
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  const clearFile = () => {
    if (uploading) return;
    setSelectedFile(null);
    setError(null);
    setIsTimeoutError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const progressLabel = analyzing
    ? ANALYSIS_MESSAGES[analysisMessageIdx]
    : `${uploadProgress}% uploaded`;

  const progressBarWidth = analyzing ? 100 : uploadProgress;

  return (
    <div className="w-full select-none">
      {/* Drop Zone */}
      {!selectedFile && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload comic file"
          onKeyDown={(e) => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer select-none bg-[#13131a] ${
            compact ? 'p-6' : 'p-10'
          } ${
            dragActive
              ? 'border-[#ffd23f] bg-[#221f14] shadow-comic'
              : 'border-[#282836] hover:border-[#ffd23f]/60 hover:bg-[#181822]'
          }`}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2 border-black ${
                dragActive
                  ? 'bg-[#ffd23f] text-black shadow-comic-sm rotate-[-3deg]'
                  : 'bg-[#1b1b26] text-[#ffd23f]'
              }`}
            >
              <CloudUpload className="w-7 h-7 stroke-[2.5]" aria-hidden="true" />
            </div>

            <div>
              <p className="font-comic text-lg text-white tracking-wider uppercase">
                {dragActive ? 'DROP TO INGEST COMIC' : 'DROP YOUR COMIC HERE'}
              </p>
              <p className="text-xs text-text-muted mt-1">or click to browse local files</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                {ACCEPTED_FORMATS.map((fmt) => (
                  <span
                    key={fmt}
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#1c1c28] text-text-secondary border border-[#2b2b3c] uppercase"
                  >
                    {fmt.replace('.', '')}
                  </span>
                ))}
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#ffd23f]/15 text-[#ffd23f] border border-[#ffd23f]/30 uppercase">
                  MAX {MAX_FILE_SIZE_MB} MB
                </span>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleInputChange}
            className="hidden"
            aria-hidden="true"
            disabled={uploading}
          />
        </div>
      )}

      {/* Selected File Card */}
      {selectedFile && (
        <div className="border-2 border-black rounded-2xl p-5 bg-[#14141c] shadow-comic">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-[#ffd23f]/15 border border-[#ffd23f]/40 rounded-xl flex items-center justify-center shrink-0">
              <File className="w-5 h-5 text-[#ffd23f]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-comic text-base text-white tracking-wide truncate">{selectedFile.name}</p>
              <p className="text-xs font-mono text-text-muted">{formatFileSize(selectedFile.size)}</p>
            </div>
            {!uploading && (
              <button
                onClick={clearFile}
                aria-label="Remove selected file"
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-[#20202c] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Section */}
          {uploading && (
            <div className="mb-4">
              <div className="h-2 bg-[#0c0c10] rounded-full overflow-hidden border border-[#22222d]">
                <div
                  className={`h-full bg-[#ffd23f] rounded-full transition-all duration-500 ${
                    analyzing ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${progressBarWidth}%` }}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Spinner size="sm" />
                <p
                  className={`text-xs font-comic tracking-wider uppercase transition-all duration-700 ${
                    analyzing ? 'text-[#ffd23f]' : 'text-text-muted'
                  }`}
                  aria-live="polite"
                  aria-label={progressLabel}
                >
                  {progressLabel}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-[#ffd23f] hover:bg-[#e6bd35] disabled:opacity-50 disabled:cursor-not-allowed text-black font-comic text-sm font-bold uppercase tracking-wider py-3 rounded-xl shadow-comic-sm border-2 border-black transition-all comic-btn-tactile"
          >
            {uploading ? (
              <>
                <Spinner size="sm" />
                {analyzing ? 'ANALYZING PANELS…' : 'UPLOADING BYTES…'}
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                INGEST &amp; ANALYZE COMIC
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div role="alert" className="mt-4 px-1 space-y-2">
          <p className="text-xs text-[#ff5779] font-medium leading-relaxed">{error}</p>

          {isTimeoutError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#282012] border-2 border-[#ffd23f]/40 text-[#ffd23f] shadow-comic-sm">
              <BookOpen className="w-4 h-4 text-[#ffd23f] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="text-xs space-y-1">
                <p className="font-comic text-sm uppercase tracking-wide">WHAT TO DO NEXT</p>
                <p className="leading-relaxed">
                  Check your{' '}
                  <Link
                    to="/library"
                    className="underline font-bold hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <Library className="w-3 h-3 inline" />
                    Vault
                  </Link>{' '}
                  — if the issue appears, it was ingested successfully. Avoid uploading the same file again while processing continues.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
