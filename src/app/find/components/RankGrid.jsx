import { Grid, List } from 'antd-mobile';
import styles from './RankGrid.module.less';

export const RankGrid = ({ length, colName, gridContent, callback }) => {
  if (!gridContent || gridContent.length === 0) {
    return null;
  }

  return (
    <div className={styles.rankGridContainer}>
      <div className={styles.rankGridHead}>
        <img 
          className={styles.firstPic} 
          src={gridContent[0].img} 
          alt={gridContent[0].key}
        />
        <span>{gridContent[0].key}</span>
      </div>
      <div className={styles.rankGridDesc}>
        <Grid className={styles.gridTitle} columns={length + 1}>
          <Grid.Item className={styles.rankingHeader}></Grid.Item>
          {colName.map((colNameItem, colNameIndex) => (
            <Grid.Item 
              key={colNameIndex} 
              className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
            >
              {colNameItem}
            </Grid.Item>
          ))}
        </Grid>
        <List>
          {gridContent.map((gridCon, index) => (
            <List.Item 
              key={index} 
              className={styles.gridListItem} 
              onClick={() => callback && callback(gridCon)}
              clickable={false}
            >
              <div className={styles.rankingRow}>
                <span className={styles.rankingNumber}>{index + 1}</span>
                <Grid className={styles.gridContent} columns={length}>
                  {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                    if (gridConItem === 'key' || gridConItem === 'img') {
                      return null;
                    }
                    return (
                      <Grid.Item 
                        key={gridConItem} 
                        className={`${styles.gridConItem} ${gridConIndex !== 0 ? styles.text : ''}`}
                      >
                        {gridCon[gridConItem]}
                      </Grid.Item>
                    );
                  })}
                </Grid>
              </div>
            </List.Item>
          ))}
        </List>
      </div>
    </div>
  );
};

