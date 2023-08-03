// Delay api calls until x 
export const debounce = <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
  let timerId: NodeJS.Timeout;

  return (...args: T) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => func(...args), delay);
  };
};


//export const pidFormattingLinux = (data: string): string => {
//    if(process.env.SYSTEM === 'linux') throw new Error("Change system env !!");
//    const _split_data: string[] = data.split("\n");
//    // filter out empty elements
//    const _not_empty: string[] = _split_data.filter(element => element);
//    // select the first one in the list
//    const _process: string = _not_empty[0];
//    const _formatted_process = _process.split(' ').filter(element => element).join(" ");
//    const pid: string = _formatted_process.split(" ")[1];
//    return pid;
//}

//export const URLcondition =
//  process.env.NODE_ENV === "development"
//    ? "/api"
//    : "https://sinteza.vercel.app";
//;
