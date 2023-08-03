// limit the rate of api calls to once every x ms
export const throttle = <T extends unknown[]>(func: (...args: T) => void, limit: number) => {
  let inThrottle = false;

  return (...args: T) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
