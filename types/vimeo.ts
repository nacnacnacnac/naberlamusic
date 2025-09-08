export interface VimeoVideo {
  uri: string;
  name: string;
  description: string | null;
  type: string;
  link: string;
  duration: number;
  width: number;
  height: number;
  language: string | null;
  created_time: string;
  modified_time: string;
  release_time: string;
  content_rating: string[];
  license: string | null;
  privacy: {
    view: string;
    embed: string;
    download: boolean;
    add: boolean;
    comments: string;
  };
  pictures: {
    uri: string;
    active: boolean;
    type: string;
    base_link: string;
    sizes: Array<{
      width: number;
      height: number;
      link: string;
      link_with_play_button?: string;
    }>;
    resource_key: string;
    default_picture: boolean;
  };
  tags: Array<{
    uri: string;
    name: string;
    tag: string;
    canonical: string;
    metadata: {
      connections: {
        videos: {
          uri: string;
          options: string[];
          total: number;
        };
      };
    };
    resource_key: string;
  }>;
  stats: {
    plays: number;
    likes: number;
    comments: number;
  };
  categories: Array<{
    uri: string;
    name: string;
    link: string;
    top_level: boolean;
    is_deprecated: boolean;
    pictures: {
      uri: string;
      active: boolean;
      type: string;
      base_link: string;
      sizes: Array<{
        width: number;
        height: number;
        link: string;
      }>;
      resource_key: string;
      default_picture: boolean;
    };
    last_video_featured_time: string;
    parent?: {
      uri: string;
      name: string;
      link: string;
    };
    metadata: {
      connections: {
        channels: {
          uri: string;
          options: string[];
          total: number;
        };
        groups: {
          uri: string;
          options: string[];
          total: number;
        };
        users: {
          uri: string;
          options: string[];
          total: number;
        };
        videos: {
          uri: string;
          options: string[];
          total: number;
        };
      };
      interactions: {
        follow: {
          added: boolean;
          added_time: string | null;
          uri: string;
        };
      };
    };
    subcategories?: Array<{
      uri: string;
      name: string;
      link: string;
    }>;
    icon: {
      uri: string;
      active: boolean;
      type: string;
      base_link: string;
      sizes: Array<{
        width: number;
        height: number;
        link: string;
      }>;
      resource_key: string;
      default_picture: boolean;
    };
    resource_key: string;
  }>;
  uploader: {
    pictures: {
      uri: string;
      active: boolean;
      type: string;
      base_link: string;
      sizes: Array<{
        width: number;
        height: number;
        link: string;
      }>;
      resource_key: string;
      default_picture: boolean;
    };
  };
  metadata: {
    connections: {
      comments: {
        uri: string;
        options: string[];
        total: number;
      };
      credits: {
        uri: string;
        options: string[];
        total: number;
      };
      likes: {
        uri: string;
        options: string[];
        total: number;
      };
      pictures: {
        uri: string;
        options: string[];
        total: number;
      };
      texttracks: {
        uri: string;
        options: string[];
        total: number;
      };
      related: {
        uri: string;
        options: string[];
      };
      recommendations: {
        uri: string;
        options: string[];
      };
      albums: {
        uri: string;
        options: string[];
        total: number;
      };
      available_albums: {
        uri: string;
        options: string[];
        total: number;
      };
      available_channels: {
        uri: string;
        options: string[];
        total: number;
      };
    };
    interactions: {
      watchlater: {
        added: boolean;
        added_time: string | null;
        uri: string;
      };
      like: {
        added: boolean;
        added_time: string | null;
        uri: string;
      };
    };
  };
  user: {
    uri: string;
    name: string;
    link: string;
    capabilities: {
      hasLiveSubscription: boolean;
      hasEnterpriseLihp: boolean;
      hasSvvTimecodedComments: boolean;
    };
    location: string;
    gender: string;
    bio: string | null;
    short_bio: string | null;
    created_time: string;
    pictures: {
      uri: string;
      active: boolean;
      type: string;
      base_link: string;
      sizes: Array<{
        width: number;
        height: number;
        link: string;
      }>;
      resource_key: string;
      default_picture: boolean;
    };
    websites: Array<{
      uri: string;
      name: string;
      link: string;
      type: string;
      description: string;
    }>;
    metadata: {
      connections: {
        albums: {
          uri: string;
          options: string[];
          total: number;
        };
        appearances: {
          uri: string;
          options: string[];
          total: number;
        };
        channels: {
          uri: string;
          options: string[];
          total: number;
        };
        feed: {
          uri: string;
          options: string[];
        };
        followers: {
          uri: string;
          options: string[];
          total: number;
        };
        following: {
          uri: string;
          options: string[];
          total: number;
        };
        groups: {
          uri: string;
          options: string[];
          total: number;
        };
        likes: {
          uri: string;
          options: string[];
          total: number;
        };
        membership: {
          uri: string;
          options: string[];
        };
        moderated_channels: {
          uri: string;
          options: string[];
          total: number;
        };
        portfolios: {
          uri: string;
          options: string[];
          total: number;
        };
        videos: {
          uri: string;
          options: string[];
          total: number;
        };
        shared: {
          uri: string;
          options: string[];
          total: number;
        };
        pictures: {
          uri: string;
          options: string[];
          total: number;
        };
        folders_root: {
          uri: string;
          options: string[];
        };
        teams: {
          uri: string;
          options: string[];
          total: number;
        };
      };
      interactions: {
        follow: {
          added: boolean;
          added_time: string | null;
          uri: string;
        };
        block: {
          added: boolean;
          added_time: string | null;
          uri: string;
        };
        report: {
          added: boolean;
          added_time: string | null;
          uri: string;
        };
      };
    };
    location_details: {
      formatted_address: string;
      latitude: number | null;
      longitude: number | null;
      city: string | null;
      state: string | null;
      neighborhood: string | null;
      sub_locality: string | null;
      state_iso_code: string | null;
      country: string | null;
      country_iso_code: string | null;
    };
    skills: Array<{
      uri: string;
      name: string;
    }>;
    available_for_hire: boolean;
    can_work_remotely: boolean;
    resource_key: string;
    account: string;
  };
  play: {
    status: string;
  };
  app: {
    name: string;
    uri: string;
  };
  status: string;
  resource_key: string;
  embed_presets: {
    uri: string;
    name: string;
    settings: {
      buttons: {
        like: boolean;
        watchlater: boolean;
        share: boolean;
        embed: boolean;
        hd: boolean;
        fullscreen: boolean;
        scaling: boolean;
      };
      logos: {
        vimeo: boolean;
        custom: {
          active: boolean;
          link: string | null;
          sticky: boolean;
        };
      };
      outro: string;
      portrait: string;
      title: string;
      byline: string;
      badge: boolean;
      byline_badge: boolean;
      collections_button: boolean;
      playbar: boolean;
      volume: boolean;
      speed: boolean;
      keyboard: boolean;
      captions: boolean;
      chapters: boolean;
      transcript: boolean;
      search: boolean;
      transparent: boolean;
      autopause: boolean;
      autoplay: boolean;
      loop: boolean;
      color: string;
      link: boolean;
      overlay_email_capture: number;
      overlay_email_capture_text: string;
      overlay_email_capture_confirmation: string;
    };
    metadata: {
      connections: {
        videos: {
          uri: string;
          options: string[];
          total: number;
        };
      };
    };
    user: {
      uri: string;
      name: string;
      link: string;
      capabilities: {
        hasLiveSubscription: boolean;
        hasEnterpriseLihp: boolean;
        hasSvvTimecodedComments: boolean;
      };
      location: string;
      gender: string;
      bio: string | null;
      short_bio: string | null;
      created_time: string;
      pictures: {
        uri: string;
        active: boolean;
        type: string;
        base_link: string;
        sizes: Array<{
          width: number;
          height: number;
          link: string;
        }>;
        resource_key: string;
        default_picture: boolean;
      };
      websites: Array<{
        uri: string;
        name: string;
        link: string;
        type: string;
        description: string;
      }>;
      metadata: {
        connections: {
          albums: {
            uri: string;
            options: string[];
            total: number;
          };
          appearances: {
            uri: string;
            options: string[];
            total: number;
          };
          channels: {
            uri: string;
            options: string[];
            total: number;
          };
          feed: {
            uri: string;
            options: string[];
          };
          followers: {
            uri: string;
            options: string[];
            total: number;
          };
          following: {
            uri: string;
            options: string[];
            total: number;
          };
          groups: {
            uri: string;
            options: string[];
            total: number;
          };
          likes: {
            uri: string;
            options: string[];
            total: number;
          };
          membership: {
            uri: string;
            options: string[];
          };
          moderated_channels: {
            uri: string;
            options: string[];
            total: number;
          };
          portfolios: {
            uri: string;
            options: string[];
            total: number;
          };
          videos: {
            uri: string;
            options: string[];
            total: number;
          };
          shared: {
            uri: string;
            options: string[];
            total: number;
          };
          pictures: {
            uri: string;
            options: string[];
            total: number;
          };
          folders_root: {
            uri: string;
            options: string[];
          };
          teams: {
            uri: string;
            options: string[];
            total: number;
          };
        };
        interactions: {
          follow: {
            added: boolean;
            added_time: string | null;
            uri: string;
          };
          block: {
            added: boolean;
            added_time: string | null;
            uri: string;
          };
          report: {
            added: boolean;
            added_time: string | null;
            uri: string;
          };
        };
      };
      location_details: {
        formatted_address: string;
        latitude: number | null;
        longitude: number | null;
        city: string | null;
        state: string | null;
        neighborhood: string | null;
        sub_locality: string | null;
        state_iso_code: string | null;
        country: string | null;
        country_iso_code: string | null;
      };
      skills: Array<{
        uri: string;
        name: string;
      }>;
      available_for_hire: boolean;
      can_work_remotely: boolean;
      resource_key: string;
      account: string;
    };
    resource_key: string;
  };
}

export interface VimeoApiResponse {
  total: number;
  page: number;
  per_page: number;
  paging: {
    next: string | null;
    previous: string | null;
    first: string;
    last: string;
  };
  data: VimeoVideo[];
}

export interface VimeoConfig {
  accessToken: string;
  clientId?: string;
  clientSecret?: string;
}

export interface SimplifiedVimeoVideo {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  thumbnail: string;
  videoUrl: string;
  embedUrl: string;
  createdAt: string;
  plays: number;
  likes: number;
  hasEmbedRestriction?: boolean;
  isPasswordProtected?: boolean;
  isPrivateView?: boolean;
  embedPrivacy?: string;
}

export interface VimeoPlaylist {
  id: string;
  name: string;
  videos: SimplifiedVimeoVideo[];
  totalCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VimeoError {
  error: string;
  error_code: number;
  developer_message: string;
  link: string | null;
}
