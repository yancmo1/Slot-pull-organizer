import { describe, expect, it } from 'vitest'
import { capitalizeWords } from '../lib/utils/formatName'

describe('capitalizeWords', () => {
  it('forces mixed-case names into title case', () => {
    expect(capitalizeWords('jOhN dOE')).toBe('John Doe')
  })

  it('preserves apostrophes and hyphens while normalizing case', () => {
    expect(capitalizeWords("o'bRIEN mary-jANE")).toBe("O'Brien Mary-Jane")
  })
})
