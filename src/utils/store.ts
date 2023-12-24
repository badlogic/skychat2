export class Store<T extends Record<keyof T, any>> {
    memory = new Map<keyof T, any>();

    get<K extends keyof T>(key: K): T[K] | undefined {
        try {
            let memResult = this.memory.get(key);
            if (memResult) return memResult as T[K];
            memResult = localStorage.getItem(key.toString()) ? (JSON.parse(localStorage.getItem(key.toString())!) as T) : undefined;
            this.memory.set(key, memResult);
            return memResult;
        } catch (e) {
            localStorage.removeItem(key.toString());
            return undefined;
        }
    }

    set<K extends keyof T>(key: K, value: T[K] | undefined) {
        if (value == undefined) {
            localStorage.removeItem(key.toString());
            this.memory.delete(key);
        } else {
            localStorage.setItem(key.toString(), JSON.stringify(value));
            this.memory.set(key, value);
        }
        return value;
    }
}
