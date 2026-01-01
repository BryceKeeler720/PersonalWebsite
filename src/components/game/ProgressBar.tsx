interface ProgressBarProps {
  progress: number;
  currentLevel: number;
  totalLevels: number;
}

export default function ProgressBar({ progress, currentLevel, totalLevels }: ProgressBarProps) {
  return (
    <div className="progress-bar">
      <div className="progress-bar-fill">
        <div 
          className="progress-bar-fill-inner" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-text">
        Level {currentLevel} of {totalLevels}
      </div>
    </div>
  );
}
