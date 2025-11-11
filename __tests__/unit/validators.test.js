const {
  sanitizeInput,
  sanitizeObject,
  isValidEmail,
  isValidURL,
  isValidChannelId,
  isValidVideoId,
  isValidCountryCode,
  extractChannelIdFromURL,
  extractVideoIdFromURL,
  validatePagination
} = require('../../utils/validators');

describe('Validators Utility', () => {
  describe('sanitizeInput', () => {
    it('should trim and escape HTML from strings', () => {
      const input = '  <script>alert("xss")</script>  ';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result.trim()).toBe(result); // No leading/trailing spaces
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
      expect(sanitizeInput({})).toEqual({});
    });

    it('should escape special characters', () => {
      const input = '<>&"\'';
      const result = sanitizeInput(input);
      expect(result).not.toBe(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values in objects', () => {
      const obj = {
        title: '  <h1>Title</h1>  ',
        count: 5,
        nested: {
          text: '<script>bad</script>'
        }
      };
      const result = sanitizeObject(obj);
      expect(result.title).not.toContain('<h1>');
      expect(result.count).toBe(5);
      expect(result.nested.text).not.toContain('<script>');
    });

    it('should handle non-object inputs', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(123)).toBe(123);
    });

    it('should preserve non-string values', () => {
      const obj = {
        str: 'test',
        num: 42,
        bool: true,
        nil: null
      };
      const result = sanitizeObject(obj);
      expect(result.num).toBe(42);
      expect(result.bool).toBe(true);
      expect(result.nil).toBe(null);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('name@subdomain.example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should validate correct URLs with protocols', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://example.com')).toBe(true);
      expect(isValidURL('https://www.example.com/path')).toBe(true);
    });

    it('should reject URLs without protocols', () => {
      expect(isValidURL('example.com')).toBe(false);
      expect(isValidURL('www.example.com')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('ftp://example.com')).toBe(false); // FTP not allowed
      expect(isValidURL('')).toBe(false);
    });
  });

  describe('isValidChannelId', () => {
    it('should validate correct YouTube channel IDs', () => {
      expect(isValidChannelId('UCxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
      expect(isValidChannelId('UC1234567890123456789012')).toBe(true);
    });

    it('should reject invalid channel IDs', () => {
      expect(isValidChannelId('short')).toBe(false);
      expect(isValidChannelId('UCtooshort')).toBe(false);
      expect(isValidChannelId('UC@invalid@@@@@@@@@@@@@@@')).toBe(false);
      expect(isValidChannelId('')).toBe(false);
    });
  });

  describe('isValidVideoId', () => {
    it('should validate correct YouTube video IDs', () => {
      expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
      expect(isValidVideoId('12345678901')).toBe(true);
    });

    it('should reject invalid video IDs', () => {
      expect(isValidVideoId('short')).toBe(false);
      expect(isValidVideoId('toolong12345')).toBe(false);
      expect(isValidVideoId('@invalid@@@@')).toBe(false);
      expect(isValidVideoId('')).toBe(false);
    });
  });

  describe('isValidCountryCode', () => {
    it('should validate correct country codes', () => {
      expect(isValidCountryCode('US')).toBe(true);
      expect(isValidCountryCode('GB')).toBe(true);
      expect(isValidCountryCode('TR')).toBe(true);
    });

    it('should reject invalid country codes', () => {
      expect(isValidCountryCode('us')).toBe(false); // lowercase
      expect(isValidCountryCode('USA')).toBe(false); // too long
      expect(isValidCountryCode('U')).toBe(false); // too short
      expect(isValidCountryCode('12')).toBe(false); // numbers
      expect(isValidCountryCode('')).toBe(false);
    });
  });

  describe('extractChannelIdFromURL', () => {
    it('should extract channel ID from youtube.com/channel/ URLs', () => {
      const url = 'https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx';
      expect(extractChannelIdFromURL(url)).toBe('UCxxxxxxxxxxxxxxxxxxxxxx');
    });

    it('should extract handle from youtube.com/@ URLs', () => {
      const url = 'https://www.youtube.com/@channelname';
      expect(extractChannelIdFromURL(url)).toBe('channelname');
    });

    it('should extract from youtube.com/c/ URLs', () => {
      const url = 'https://www.youtube.com/c/channelname';
      expect(extractChannelIdFromURL(url)).toBe('channelname');
    });

    it('should extract from youtube.com/user/ URLs', () => {
      const url = 'https://www.youtube.com/user/username';
      expect(extractChannelIdFromURL(url)).toBe('username');
    });

    it('should return null for invalid URLs', () => {
      expect(extractChannelIdFromURL('https://example.com')).toBe(null);
      expect(extractChannelIdFromURL('invalid')).toBe(null);
      expect(extractChannelIdFromURL('')).toBe(null);
    });
  });

  describe('extractVideoIdFromURL', () => {
    it('should extract video ID from youtube.com/watch URLs', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractVideoIdFromURL(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be URLs', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractVideoIdFromURL(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/embed URLs', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(extractVideoIdFromURL(url)).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URLs', () => {
      expect(extractVideoIdFromURL('https://example.com')).toBe(null);
      expect(extractVideoIdFromURL('https://youtube.com/channel/test')).toBe(null);
      expect(extractVideoIdFromURL('')).toBe(null);
    });
  });

  describe('validatePagination', () => {
    it('should return valid pagination with defaults', () => {
      const result = validatePagination();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should validate and parse page and limit', () => {
      const result = validatePagination('3', '15');
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
      expect(result.offset).toBe(30); // (3-1) * 15
    });

    it('should enforce minimum values', () => {
      const result = validatePagination('-1', '0');
      expect(result.page).toBe(1);
      expect(result.limit).toBeGreaterThanOrEqual(1); // Defaults to 20 if invalid
    });

    it('should enforce maximum limit', () => {
      const result = validatePagination('1', '200', 100);
      expect(result.limit).toBe(100);
    });

    it('should handle invalid inputs gracefully', () => {
      const result = validatePagination('invalid', 'bad');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should calculate correct offset', () => {
      expect(validatePagination('1', '10').offset).toBe(0);
      expect(validatePagination('2', '10').offset).toBe(10);
      expect(validatePagination('5', '25').offset).toBe(100);
    });
  });
});
