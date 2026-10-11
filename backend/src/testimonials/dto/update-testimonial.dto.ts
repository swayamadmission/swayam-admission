import { PartialType } from '@nestjs/mapped-types';
import { CreateTestimonialDto } from './create-testimonial.dto';

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {}
