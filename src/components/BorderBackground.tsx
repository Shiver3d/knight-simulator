import bgBorder from '../assets/border/borderBase.png';
import bgEyes from '../assets/border/BorderEyes.png';
import bgRedEyes from '../assets/border/borderRedEyes.png';

interface BorderBackgroundProps {
  hp: number;
}

const BorderBackground = ({ hp }: BorderBackgroundProps) => {
  const isLowHp = hp <= 30;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
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
        src={isLowHp ? bgRedEyes : bgEyes}
        alt={isLowHp ? 'Red Eyes' : 'Eyes'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
};

export default BorderBackground;