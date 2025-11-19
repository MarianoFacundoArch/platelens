declare module 'react-native-mmkv' {
  export interface MMKVConfiguration {
    id?: string;
  }

  export class MMKV {
    constructor(config?: MMKVConfiguration);
    set(key: string, value: string | number | boolean): void;
    getString(key: string): string | undefined;
    delete(key: string): void;
  }
}
