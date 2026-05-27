import bgBorder from '../assets/border/borderBase.png';
import bgEyes from '../assets/border/BorderEyes.png';

const BorderBackground = () => {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: -500}}>
      <img src={bgBorder} alt="Border" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <img src={bgEyes} alt="Eyes" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

export default BorderBackground;