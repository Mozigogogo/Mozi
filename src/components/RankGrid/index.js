import { useState } from 'react';
import { Grid, List } from 'antd-mobile';
import './index.css';

export const RankGrid = (props) => {
  const { gridContent = [], colName = [], length = 2, callback } = props;
  const [imageErrors, setImageErrors] = useState({});

  if (!gridContent || gridContent.length === 0) {
    return <div>暂无数据</div>;
  }

  const handleImageError = (key) => {
    setImageErrors(prev => ({
      ...prev,
      [key]: true
    }));
  };

  const getImageSrc = (url, key) => {
    if (imageErrors[key]) {
      return '/default-coin.svg';
    }
    return url || '/default-coin.svg';
  };

  return (
    <div className='rankGridContainer'>
      <div className='rankGridHead'>
        <img
          className='firstPic'
          src={getImageSrc(gridContent[0].img, `head-${gridContent[0].key}`)}
          alt={gridContent[0].key}
          onError={() => handleImageError(`head-${gridContent[0].key}`)}
        />
        <span>{gridContent[0].key}</span>
      </div>
      <div className='rankGridDesc'>
        <Grid className='gridTitle' columns={length + 1}>
          <Grid.Item className="gridTitleItem ranking-header"></Grid.Item>
          {
            colName.map((colNameItem, colNameIndex) => {
              return (
                <Grid.Item
                  key={colNameIndex}
                  className={`gridTitleItem ${colNameIndex !== 0 ? 'text' : ''}`}
                >
                  {colNameItem}
                </Grid.Item>
              )
            })
          }
        </Grid>
        <List>
          {
            gridContent.map((gridCon, index) => {
              return (
                <List.Item
                  key={index}
                  className='gridListItem'
                  onClick={() => { callback && callback(gridCon) }}
                  clickable={false}
                >
                  <div className='ranking-row'>
                    <span className='ranking-number'>{index + 1}</span>
                    <Grid className='gridContent' columns={length}>
                      {
                        Object.keys(gridCon).map((gridConItem, girdConIndex) => {
                          if (gridConItem === 'key' || gridConItem === 'img') {
                            return null;
                          }
                          return (
                            <Grid.Item
                              key={girdConIndex}
                              className={`gridConItem ${girdConIndex !== 0 ? 'text' : ''}`}
                            >
                              {gridCon[gridConItem]}
                            </Grid.Item>
                          )
                        })
                      }
                    </Grid>
                  </div>
                </List.Item>
              )
            })
          }
        </List>
      </div>
    </div>
  );
};

export default RankGrid;