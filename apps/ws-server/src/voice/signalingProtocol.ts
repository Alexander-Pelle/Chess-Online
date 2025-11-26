// Voice chat signaling protocol message types
export const VOICE_OFFER = 10;
export const VOICE_ANSWER = 11;
export const VOICE_ICE_CANDIDATE = 12;
export const VOICE_ENABLE = 13;
export const VOICE_DISABLE = 14;

// Encoding functions for voice signaling
export function encodeVoiceSignal(type: number, gameId: number, payload: string): Buffer {
    const payloadBuffer = Buffer.from(payload, 'utf-8');
    const buffer = Buffer.alloc(7 + payloadBuffer.length); 
    
    buffer.writeUInt8(type, 0);
    buffer.writeUInt32BE(gameId, 1);
    buffer.writeUInt16BE(payloadBuffer.length, 5);
    payloadBuffer.copy(buffer, 7);
    
    return buffer;
}

export function decodeVoiceSignal(message: Buffer): { type: number, gameId: number, payload: string } {
    const view = new DataView(message.buffer, message.byteOffset, message.byteLength);
    const type = view.getUint8(0);
    const gameId = view.getUint32(1, false); // big endian
    const payloadLength = view.getUint16(5, false);
    const payload = message.slice(7, 7 + payloadLength).toString('utf-8');
    
    return { type, gameId, payload };
}

