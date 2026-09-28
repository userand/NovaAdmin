import {
  Controller, Post, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 图片类型白名单：扩展名由服务端按真实类型决定(不信任客户端的文件名/mimetype)，
 * 并校验文件头魔数。不放行 SVG(可内嵌脚本，同源访问即 XSS)。
 */
const IMAGE_TYPES: { ext: string; mimes: string[]; match: (b: Buffer) => boolean }[] = [
  { ext: '.jpg', mimes: ['image/jpeg'], match: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: '.png', mimes: ['image/png'],
    match: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { ext: '.gif', mimes: ['image/gif'], match: (b) => b.length > 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii')) },
  {
    ext: '.webp', mimes: ['image/webp'],
    match: (b) => b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

@ApiTags('文件上传')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  @Post('image')
  @ApiOperation({ summary: '上传图片(≤5MB, jpg/png/gif/webp)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    return saveImage(file);
  }
}

export const IMAGE_MAX_SIZE = MAX_SIZE;

/** 校验并保存图片(白名单 + 魔数校验，扩展名由服务端决定)；后台上传与会员头像上传共用 */
export function saveImage(file?: Express.Multer.File) {
  if (!file) throw new BadRequestException('请选择要上传的文件');
  const type = IMAGE_TYPES.find((t) => t.mimes.includes(file.mimetype) && t.match(file.buffer));
  if (!type) throw new BadRequestException('仅支持 jpg/png/gif/webp 格式图片');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now()}-${uuidv4().slice(0, 8)}${type.ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return { url: `/api/uploads/${filename}`, name: file.originalname, size: file.size };
}
