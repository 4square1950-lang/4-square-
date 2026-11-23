export const MASCOTS = ['🦊','🐼','🐯','🦁','🐸','🐷','🐨','🐰','🐲','🦄','🦉','🐺','🐻','🐧','🦋','🐙','🦕','🐠','🦜','🦩','🐬','🦈','🐢','🦝','🐭','🐱','🐶','🐮','🦅','🐴','🐘','🦔'] as const;
export const MASCOT_NAMES = ['Fox','Panda','Tiger','Lion','Frog','Pig','Koala','Rabbit','Dragon','Unicorn','Owl','Wolf','Bear','Penguin','Butterfly','Octopus','Dinosaur','Tropical fish','Parrot','Flamingo','Dolphin','Shark','Turtle','Raccoon','Mouse','Cat','Dog','Cow','Eagle','Horse','Elephant','Hedgehog'] as const;

export function youtubeChannel(value: string) {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' && ['www.youtube.com','youtube.com'].includes(url.hostname) && !url.port &&
      !url.username && !url.password && /^\/(?:@[\p{L}\p{N}._-]+|(?:channel|c|user)\/[\p{L}\p{N}._-]+)\/?$/u.test(decodeURIComponent(url.pathname))) {
      return 'https://www.youtube.com' + url.pathname.replace(/\/$/, '');
    }
  } catch {}
  return undefined;
}
