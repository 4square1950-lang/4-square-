import { CHARACTERS, getUnlockedCharacterIds, unlockCharacter, setEquippedCharacterId } from '../utils/characters';
import { PlayerCard } from './MarketModal';

interface Props {
  isOpen: boolean;
  coins: number;
  equipped: string;
  onUpdateCoins: (coins: number) => void;
  onEquipCharacter: (id: string) => void;
  onClose: () => void;
}

export function CharacterShopModal({ isOpen, coins, equipped, onUpdateCoins, onEquipCharacter, onClose }: Props) {
  if (!isOpen) return null;
  const unlocked = getUnlockedCharacterIds();
  return <div className="league-overlay" role="dialog" aria-modal="true" aria-label="Character locker">
    <section className="league-panel">
      <header className="league-header"><h2>Locker</h2><span className="ml-auto text-sm text-amber-200">{coins} campaign coins</span><button className="league-button" onClick={onClose}>Back to studio</button></header>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{CHARACTERS.map((character) => {
        const owned = unlocked.includes(character.id) || equipped === character.id;
        return <article className="field-panel grid gap-2 p-2" key={character.id}>
          <PlayerCard characterId={character.id}/>
          <button className="league-button disabled:opacity-50" disabled={equipped === character.id || (!owned && coins < character.price)}
            onClick={() => {
              if (owned) {
                setEquippedCharacterId(character.id);
                onEquipCharacter(character.id);
              } else if (coins >= character.price && !getUnlockedCharacterIds().includes(character.id)) {
                unlockCharacter(character.id);
                onUpdateCoins(coins - character.price);
              }
            }}>{equipped === character.id ? 'Equipped' : owned ? 'Equip' : `Unlock · ${character.price} coins`}</button>
        </article>;
      })}</div>
    </section>
  </div>;
}
