// Delay api calls until x
export const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  delay: number
) => {
  let timerId: NodeJS.Timeout;

  return (...args: T) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => func(...args), delay);
  };
};
