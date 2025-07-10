export class InvalidUrlError {
  readonly _tag = 'InvalidUrlError'
  constructor(readonly message: string) {}
}

export class FetchError {
  readonly _tag = 'FetchError'
  constructor(readonly message: string) {}
}

export class ParseError {
  readonly _tag = 'ParseError'
  constructor(readonly message: string) {}
}

export class LocalhostError {
  readonly _tag = 'LocalhostError'
  constructor(readonly message: string) {}
}
