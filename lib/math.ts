export const round1 = (val: number) => Math.round(val * 10) / 10;
export const round2 = (val: number) => Math.round(val * 100) / 100;
export const round4 = (val: number) => Math.round(val * 10000) / 10000;

export function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
