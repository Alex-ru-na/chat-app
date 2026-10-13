export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  nextCursor: string | null;
}
