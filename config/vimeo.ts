/**
 * Vimeo Configuration
 * 
 * Bu dosya Vimeo API konfigürasyonunu içerir.
 * Production'da environment variables kullanılmalıdır.
 */

export const VIMEO_CONFIG = {
  // API Base URL
  API_BASE_URL: 'https://api.vimeo.com',
  
  // API Version
  API_VERSION: '3.4',
  
  // Rate Limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 100,
    REQUESTS_PER_HOUR: 1000,
  },
  
  // Cache Settings
  CACHE: {
    VIDEO_LIST_TTL: 60 * 60 * 1000, // 1 hour
    VIDEO_DETAIL_TTL: 24 * 60 * 60 * 1000, // 24 hours
    THUMBNAIL_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PER_PAGE: 25,
    MAX_PER_PAGE: 100,
  },
  
  // Video Quality Settings
  VIDEO_QUALITY: {
    THUMBNAIL_SIZES: ['small', 'medium', 'large'] as const,
    PREFERRED_THUMBNAIL_SIZE: 'medium' as const,
  },
  
  // Supported Video Fields
  VIDEO_FIELDS: [
    'uri',
    'name',
    'description',
    'duration',
    'width',
    'height',
    'created_time',
    'modified_time',
    'release_time',
    'link',
    'pictures',
    'stats',
    'privacy',
    'status',
    'resource_key',
    'tags',
    'categories',
  ].join(','),
  
  // Error Messages
  ERROR_MESSAGES: {
    INVALID_TOKEN: 'Geçersiz access token. Lütfen token\'ınızı kontrol edin.',
    NETWORK_ERROR: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
    RATE_LIMIT_EXCEEDED: 'API rate limit aşıldı. Lütfen bir süre bekleyin.',
    VIDEO_NOT_FOUND: 'Video bulunamadı.',
    PERMISSION_DENIED: 'Bu videoya erişim izniniz yok.',
    QUOTA_EXCEEDED: 'API kotanız doldu.',
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    CONNECTION_SUCCESS: 'Vimeo bağlantısı başarıyla kuruldu!',
    VIDEOS_LOADED: 'Videolar başarıyla yüklendi.',
    CACHE_UPDATED: 'Video önbelleği güncellendi.',
  },
} as const;

/**
 * Vimeo API Scopes
 * Token oluştururken gerekli olan izinler
 */
export const VIMEO_SCOPES = [
  'private', // Private videolara erişim
  'public',  // Public videolara erişim
  'purchased', // Satın alınan videolara erişim
  'create',  // Video oluşturma (opsiyonel)
  'edit',    // Video düzenleme (opsiyonel)
  'delete',  // Video silme (opsiyonel)
] as const;

/**
 * Development/Test Configuration
 * Sadece development ortamında kullanılır
 */
export const DEV_CONFIG = {
  ENABLE_LOGGING: __DEV__,
  MOCK_API_RESPONSES: false,
  CACHE_DISABLED: false,
  RATE_LIMIT_DISABLED: __DEV__,
} as const;

/**
 * Vimeo Player Configuration
 * Video oynatıcı için varsayılan ayarlar
 */
export const PLAYER_CONFIG = {
  DEFAULT_OPTIONS: {
    autoplay: false,
    loop: false,
    muted: false,
    controls: true,
    responsive: true,
    background: false,
  },
  
  BACKGROUND_AUDIO_OPTIONS: {
    autoplay: true,
    loop: false,
    muted: false,
    controls: false,
    responsive: false,
    background: true,
  },
  
  EMBED_PARAMETERS: {
    title: 0,      // Video başlığını gizle
    byline: 0,     // Kullanıcı adını gizle
    portrait: 0,   // Kullanıcı resmini gizle
    badge: 0,      // Vimeo logosunu gizle
    autopause: 0,  // Otomatik duraklama kapalı
    quality: 'auto', // Otomatik kalite
  },
} as const;

export type VimeoThumbnailSize = typeof VIMEO_CONFIG.VIDEO_QUALITY.THUMBNAIL_SIZES[number];
export type VimeoScope = typeof VIMEO_SCOPES[number];
