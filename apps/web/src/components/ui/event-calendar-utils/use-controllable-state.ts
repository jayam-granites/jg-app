import { useCallback, useState } from 'react'

export function useControllableState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, (value: T) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? (controlledValue as T) : uncontrolledValue

  const setValue = useCallback(
    (nextValue: T) => {
      if (Object.is(nextValue, value)) return
      if (!isControlled) setUncontrolledValue(nextValue)
      onChange?.(nextValue)
    },
    [isControlled, onChange, value],
  )

  return [value, setValue]
}
