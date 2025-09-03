import { MatchingInfo, GetMatchingInfoQueries } from '../store/matchinginfo/types';
import { sampleMatchingData } from '../data/sampleData';


export class DatabaseService {
  private static instance: DatabaseService;
  private data: MatchingInfo[] = sampleMatchingData;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }


  async getMatchingInfo(params: { page?: number, limit?: string }): Promise<GetMatchingInfoQueries> {
    const page = params.page || 1;
    const limit = parseInt(params.limit || '10');
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedData = this.data.slice(startIndex, endIndex);
    const total = this.data.length;
    const totalPage = Math.ceil(total / limit);

    return {
      page,
      total,
      totalPage,
      matchinginfo: paginatedData
    };
  }


  async getMatchesByCountry(country: string): Promise<MatchingInfo[]> {
    return this.data.filter(match => 
      match.country.toLowerCase() === country.toLowerCase()
    );
  }


  async getMatchesByDate(date: string): Promise<MatchingInfo[]> {
    return this.data.filter(match => match.date === date);
  }


  async getLiveMatches(): Promise<MatchingInfo[]> {
    return this.data.filter(match => !match.result);
  }


  async getFinishedMatches(): Promise<MatchingInfo[]> {
    return this.data.filter(match => match.result);
  }


  async addMatch(match: Omit<MatchingInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<MatchingInfo> {
    const newMatch: MatchingInfo = {
      ...match,
      id: (this.data.length + 1).toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data.push(newMatch);
    return newMatch;
  }


  async updateMatch(id: string, updates: Partial<MatchingInfo>): Promise<MatchingInfo | null> {
    const index = this.data.findIndex(match => match.id === id);
    if (index === -1) return null;

    this.data[index] = {
      ...this.data[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.data[index];
  }


  async getAllMatches(): Promise<MatchingInfo[]> {
    return this.data;
  }

  async loadFromDatabase(databaseFile?: string): Promise<void> {
    console.log('Loading from database file:', databaseFile || 'using sample data');
  }
}
export const databaseService = DatabaseService.getInstance();
