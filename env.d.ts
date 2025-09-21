declare module 'better-sqlite3' {
  export interface Database {
    prepare: any;
    transaction: any;
    exec: any;
    close: any;
    [key: string]: any;
  }
  
  function Database(filename: string, options?: any): Database;
  export default Database;
}

declare module 'better-sqlite3-session-store' {
  import session from 'express-session';
  
  function SQLiteStore(session: any): any;
  export default SQLiteStore;
}