import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkActionDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
