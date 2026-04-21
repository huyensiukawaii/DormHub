import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewDocumentDto {
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
