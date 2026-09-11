
type Timestamp = bigint; // millis from 1970

export default Timestamp;

export function formatTime(time: Timestamp): string {
    let date = new Date(Number(time));
    let now = new Date();
    let isRecent = (now.getTime() - date.getTime()) > 6 * 60 * 60 * 1000;
    return (isRecent
        ? `${date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
        })}`
        : `${date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })}`
    )
}
