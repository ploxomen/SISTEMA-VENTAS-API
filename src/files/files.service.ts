import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

@Injectable()
export class FilesService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'products');
  async saveProductImages(files: Express.Multer.File[]) {
    await mkdir(this.uploadDir, { recursive: true });

    const savedFiles: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    }[] = [];

    try {
      for (const file of files) {
        // Usa una lista permitida de extensiones en producción.
        const extension = extname(file.originalname).toLowerCase();
        const filename = `${randomUUID()}${extension}`;
        const absolutePath = join(this.uploadDir, filename);

        await writeFile(absolutePath, file.buffer);

        savedFiles.push({
          path: `/uploads/products/${filename}`,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });
      }

      return savedFiles;
    } catch {
      throw new InternalServerErrorException(
        'No se pudieron guardar las imágenes',
      );
    }
  }
  async deleteProductImages(
  files: { path: string }[],
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const filename = file.path.split('/').pop();

      if (!filename) return;

      try {
        await unlink(
          join(this.uploadDir, filename),
        );
      } catch {
        // En producción, registra el error para
        // poder limpiar archivos huérfanos.
      }
    }),
  );
}
}
