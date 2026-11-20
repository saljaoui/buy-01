import { GlobalService } from './global-service';
import { environment } from '../../../environments/environment';

describe('GlobalService', () => {
  it('uses the API base URL from the environment', () => {
    const url = GlobalService.clientIP;

    expect(url).toBe(environment.apiBaseUrl);
  });
});
