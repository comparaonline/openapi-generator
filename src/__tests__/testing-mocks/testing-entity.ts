enum typeTesting {
  A = 'a', B = 'b'
}

export class TestingEntity {
  name?: string
  lastName?: string | null
  typeTesting?: typeTesting | number
  typeTesting2?: string | number | null
}

export class Unformed {
  name: any
}
