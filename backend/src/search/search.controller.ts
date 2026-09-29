import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') keyword: string,
    @Query('type') type: string = 'ALL',
    @Query('limit') limit?: string,
  ) {
    if (!keyword || !keyword.trim()) {
      throw new BadRequestException('Search keyword "q" is required');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.searchService.search(keyword, type.toUpperCase(), parsedLimit);
  }

  @Get('suggestions')
  getSuggestions(@Query('q') keyword: string) {
    if (!keyword || !keyword.trim()) {
      return {
        all: [],
        colleges: [],
        courses: [],
        studyMaterials: [],
        guides: [],
        exams: [],
        scholarships: [],
        streams: [],
        blogs: [],
        reports: [],
        locations: [],
      };
    }
    return this.searchService.getSuggestions(keyword);
  }

  @Get('trending')
  getTrending() {
    return this.searchService.getTrendingSearches();
  }
}
