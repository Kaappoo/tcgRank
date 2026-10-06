/** Alphabet without look-alike characters (0/O, 1/I/L) so codes survive being read aloud. */
const JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const JOIN_CODE_LENGTH = 6

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

const randomString = (alphabet: string, length: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return out
}

export const newId = (): string => randomString(ID_ALPHABET, 16)

export const newJoinCode = (): string => randomString(JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH)

export const normalizeJoinCode = (input: string): string =>
  input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, JOIN_CODE_LENGTH)

export const isJoinCode = (input: string): boolean =>
  input.length === JOIN_CODE_LENGTH && [...input].every((c) => JOIN_CODE_ALPHABET.includes(c))
