import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class FeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(1)
  message: string;
}
