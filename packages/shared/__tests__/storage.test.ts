import { uploadBaseDir, documentStoragePath } from '../src/storage';

describe('uploadBaseDir', () => {
  it('should return default when UPLOAD_DIR is not set', () => {
    delete process.env.UPLOAD_DIR;
    expect(uploadBaseDir()).toBe('./uploads');
  });

  it('should return UPLOAD_DIR when set', () => {
    process.env.UPLOAD_DIR = '/data/uploads';
    expect(uploadBaseDir()).toBe('/data/uploads');
    delete process.env.UPLOAD_DIR;
  });
});

describe('documentStoragePath', () => {
  it('should build correct path', () => {
    delete process.env.UPLOAD_DIR;
    const path = documentStoragePath('tenant-1', 'doc-1', 'file.pdf');
    expect(path).toContain('uploads/tenant-1/doc-1__file.pdf');
  });

  it('should sanitize unsafe characters in filename', () => {
    delete process.env.UPLOAD_DIR;
    const path = documentStoragePath('t1', 'd1', 'my file (copy).pdf');
    expect(path).toContain('t1/d1__');
    expect(path).toContain('my_file_copy_.pdf');
  });

  it('should use UPLOAD_DIR when set', () => {
    process.env.UPLOAD_DIR = '/data';
    const path = documentStoragePath('t1', 'd1', 'file.txt');
    expect(path).toBe('/data/t1/d1__file.txt');
    delete process.env.UPLOAD_DIR;
  });

  it('should handle filenames with multiple dots', () => {
    delete process.env.UPLOAD_DIR;
    const path = documentStoragePath('t1', 'd1', 'archive.tar.gz');
    expect(path).toContain('t1/d1__archive.tar.gz');
  });
});
