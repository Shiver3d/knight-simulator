import bgBorder from '../assets/border/borderBase.png';
import bgEyes from '../assets/border/BorderEyes.png';
import bgRedEyes from '../assets/border/borderRedEyes.png';

interface BorderBackgroundProps {
  hp: number;
}

const BorderBackground = ({ hp }: BorderBackgroundProps) => {
  const isLowHp = hp <= 30;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <img
        src={bgBorder}
        alt="Border"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      <img
        src={bgEyes}
        alt="Eyes"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLowHp ? 0 : 1,
          transition: 'opacity 300ms ease',
        }}
      />

      <img
        src={bgRedEyes}
        alt="Red Eyes"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLowHp ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />
    </div>
  );
};

export default BorderBackground;