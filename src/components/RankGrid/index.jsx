import React from 'react';
import { Grid, List } from 'antd-mobile';
import './index.css';

export const RankGrid = (props) => {
  const { gridContent = [], colName = [], length = 2, callback } = props;

  if (!gridContent || gridContent.length === 0) {
    return <div>暂无数据</div>;
  }

  return (
    <div className='rankGridContainer'>
      <div className='rankGridHead'>
        <img 
          className='firstPic' 
          src={gridContent[0].img} 
          alt={gridContent[0].key}
          onError={(e) => {
            e.target.src = '/default-coin.png'; // 默认图片
          }}
        />
        <span>{gridContent[0].key}</span>
      </div>
      <div className='rankGridDesc'>
        <Grid className='gridTitle' columns={length}>
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