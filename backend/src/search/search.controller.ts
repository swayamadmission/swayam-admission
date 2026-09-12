import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') keyword: string, @Query('type') type: string = 'ALL') {
    if (!keyword) {
      throw new BadRequestException('Search keyword "q" is required');
    }
    return this.searchService.search(keyword, type.toUpperCase());
  }

  @Get('suggestions')
  getSuggestions(@Query('q') keyword: string) {
    if (!keyword) {
      return [];
    }
    return this.searchService.getSuggestions(keyword);
  }

  @Get('trending')
  getTrending() {
    return this.searchService.getTrendingSearches();
  }
}
