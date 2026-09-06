import { TransportControls } from './TransportControls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { DeviceSelector } from './DeviceSelector';
import { NowPlayingInfo } from './NowPlayingInfo';
import { AutoQueueToggle } from './AutoQueueToggle';
import { SleepTimer } from './SleepTimer';
import { MiniPlayerToggle } from './MiniPlayer';
import styles from './NowPlayingBar.module.css';

export function NowPlayingBar() {
  return (
    <footer className={styles['player-bar']}>
      <div className={styles['player-bar-left']}>
        <NowPlayingInfo />
      </div>
      <div className={styles['player-bar-center']}>
        <TransportControls />
        <ProgressBar />
      </div>
      <div className={styles['player-bar-right']}>
        <MiniPlayerToggle />
        <SleepTimer />
        <AutoQueueToggle />
        <DeviceSelector />
        <VolumeControl />
      </div>
    </footer>
  );
}
