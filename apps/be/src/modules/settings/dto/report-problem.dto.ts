import { IsString, MinLength } from 'class-validator';

export class ReportProblemDto {
  @IsString()
  @MinLength(1)
  message: string;
}
