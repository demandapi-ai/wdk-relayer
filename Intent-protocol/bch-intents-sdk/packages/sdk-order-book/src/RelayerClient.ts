import {
    Intent,
    DutchAuctionParams,
    LimitOrderParams,
    Network,
    IntentNotFoundError,
    RelayerUnreachableError,
    IntentError
} from '@bch-intents/sdk-common';

export interface RelayerConfig {
    url?: string;
    network?: Network;
}

const DEFAULT_MAINNET_URL = 'https://relayer.bch-intents.org';
const DEFAULT_CHIPNET_URL = 'http://localhost:3005'; // Fallback for local testing

/**
 * HTTP client for interacting with the BCH Intents Relayer API.
 */
export class RelayerClient {
    public readonly url: string;

    constructor(config: RelayerConfig = {}) {
        if (config.url) {
            this.url = config.url.replace(/\/$/, ''); // strip trailing slash
        } else if (config.network === 'mainnet') {
            this.url = DEFAULT_MAINNET_URL;
        } else {
            this.url = DEFAULT_CHIPNET_URL;
        }
    }

    /**
     * Fetch all intents from the relayer (active and completed).
     */
    async getIntents(): Promise<{ active: Intent[], completed: Intent[] }> {
        return this.fetchJson<{ active: Intent[], completed: Intent[] }>('/intents');
    }

    /**
     * Fetch a specific intent by its ID.
     * @throws {IntentNotFoundError} if the intent does not exist
     */
    async getIntent(id: string): Promise<Intent> {
        try {
            return await this.fetchJson<Intent>(`/intent/${id}`);
        } catch (err: any) {
            if (err.message?.includes('404')) {
                throw new IntentNotFoundError(id);
            }
            throw err;
        }
    }

    /**
     * Submit a new Limit Order to the relayer.
     * The relayer will construct the contract, store the intent, and return the details.
     * @returns The generated Intent ID and generated contract/token addresses
     */
    async createLimitOrder(params: LimitOrderParams): Promise<{ intentId: string; contractAddress: string; tokenAddress: string }> {
        const payload = {
            makerAddress: params.makerAddress,
            sellToken: params.sellToken === 'BCH' ? '' : params.sellToken,
            buyToken: params.buyToken === 'BCH' ? '' : params.buyToken,
            sellAmount: params.sellAmount.toString(),
            buyAmount: params.buyAmount.toString(),
            orderType: 'limit',
            expiryTime: params.expiryTime ? Number(params.expiryTime) : undefined,
        };
        return this.fetchJson('/intent/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Submit a new Dutch Auction to the relayer.
     * The relayer will construct the contract, store the intent, and return the details.
     * @returns The generated Intent ID and generated contract/token addresses
     */
    async createDutchAuction(params: DutchAuctionParams): Promise<{ intentId: string; contractAddress: string; tokenAddress: string }> {
        const payload = {
            makerAddress: params.makerAddress,
            sellToken: params.sellToken === 'BCH' ? '' : params.sellToken,
            buyToken: params.buyToken === 'BCH' ? '' : params.buyToken,
            sellAmount: params.sellAmount.toString(),
            // The relayer's bot handles varying buy amounts based on duration, but currently the relayer API accepts 'buyAmount'
            // We'll pass the startBuyAmount as the baseline.
            buyAmount: params.startBuyAmount.toString(),
            orderType: 'dutch',
            duration: params.duration ? Number(params.duration) : undefined,
        };
        return this.fetchJson('/intent/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Listen for real-time events from the relayer (e.g. 'intent:created', 'intent:filled').
     * @param onEvent Callback triggered on every message
     * @returns A function to close the WebSocket connection
     */
    listen(onEvent: (event: { type: string; data: any }) => void): () => void {
        const wsUrl = this.url.replace(/^http/, 'ws') + '/ws';
        const ws = new globalThis.WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`[RelayerClient] Connected to WebSocket at ${wsUrl}`);
        };

        ws.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data as string);
                onEvent(parsed);
            } catch (e) {
                console.warn('[RelayerClient] Failed to parse WebSocket message:', event.data);
            }
        };

        ws.onerror = (error) => {
            console.error(`[RelayerClient] WebSocket error:`, error);
        };

        /* Return an unsubscribe function */
        return () => {
            if (ws.readyState === globalThis.WebSocket.OPEN) {
                ws.close();
            }
        };
    }

    /**
     * Helper to wrap fetch calls with robust error handling.
     */
    private async fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
        const fullUrl = `${this.url}${path}`;
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };

            const response = await fetch(fullUrl, { ...options, headers });

            if (!response.ok) {
                let errorMsg = `HTTP ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) errorMsg += `: ${errorData.error}`;
                } catch {
                    // Ignore non-json body
                }
                throw new IntentError(errorMsg);
            }

            return await response.json() as T;
        } catch (error: any) {
            // Check for network connectivity errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new RelayerUnreachableError(this.url);
            }
            if (error instanceof IntentError) {
                throw error;
            }
            throw new IntentError(`Network request failed: ${error.message}`);
        }
    }
}
