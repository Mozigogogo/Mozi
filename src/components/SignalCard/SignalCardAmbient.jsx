import styles from './index.module.less';

const GRADE_AMBIENT_CLASS = {
  S: 'ambientGlowS',
  A: 'ambientGlowA',
  B: 'ambientGlowB',
  C: 'ambientGlowC',
};

export function getGradeAmbientClassName(grade, stylesMap = styles) {
  const key = String(grade || '').toUpperCase();
  const token = GRADE_AMBIENT_CLASS[key];
  return token ? stylesMap[token] : stylesMap.ambientGlowS;
}

export default function SignalCardAmbient({ grade, className = '' }) {
  const gradeAmbientClass = getGradeAmbientClassName(grade);

  return (
    <div
      className={`${styles.ambientGlow} ${gradeAmbientClass} ${className}`.trim()}
      aria-hidden
    />
  );
}
