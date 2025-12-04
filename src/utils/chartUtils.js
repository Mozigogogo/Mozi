export const handleOptions = (data, type, msg) => {
  console.log('Chart data:', data, 'Type:', type);
  
  if (type === 'samebar') {
    const labelShort = msg && typeof msg === 'object' && msg.labels && msg.labels.short ? msg.labels.short : '空';
    const labelLong = msg && typeof msg === 'object' && msg.labels && msg.labels.long ? msg.labels.long : '多';
    const labelRatio = msg && typeof msg === 'object' && msg.labels && msg.labels.ratio ? msg.labels.ratio : '多空比';
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        }
      },
      legend: {
        selectedMode: false,
        data: [labelShort, labelLong, labelRatio],
        top: '3%',
        left: 'center',
        itemWidth: 20,
        itemHeight: 12,
        itemGap: 10,
        textStyle: {
          fontSize: 11,
          color: '#666'
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '20%',
        containLabel: false
      },
      yAxis: [{
        type: 'value'
      }, {
        type: 'value'
      }],
      xAxis: {
        type: 'category',
        data: data.xAxisData
      },
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          start: 80,
          end: 100,
          top: '87%',
          height: 20
        }
      ],
      series: [
        {
          name: labelShort,
          type: 'bar',
          stack: 'total',
          color: '#FA5F5F',
          data: data.shortData
        },
        {
          name: labelLong,
          type: 'bar',
          stack: 'total',
          color: '#11B787',
          emphasis: {
            focus: 'series'
          },
          data: data.longData
        },
        {
          name: '多空比',
          type: 'line',
          yAxisIndex: 1,
          data: data.longShortData,
          lineStyle: {
            color: '#FF9A37'
          },
          itemStyle: {
            color: '#FF9A37'
          }
        }
      ]
    };
  }

  if (type === 'kline') {
    // K线图配置（国际市场习惯：绿涨红跌）
    const upColor = '#02c076';  // 阳线颜色（绿色-涨）
    const upBorderColor = '#008F28';
    const downColor = '#ff3333'; // 阴线颜色（红色-跌）
    const downBorderColor = '#8A0000';

    // 计算MA线数据
    const calculateMA = (dayCount, data) => {
      const result = [];
      for (let i = 0, len = data.values.length; i < len; i++) {
        if (i < dayCount) {
          result.push('-');
          continue;
        }
        let sum = 0;
        for (let j = 0; j < dayCount; j++) {
          sum += +data.values[i - j][1];
        }
        result.push(sum / dayCount);
      }
      return result;
    };

    return {
      legend: {
        show: false,
        type: 'scroll',
        data: ['K线', 'MA5', 'MA10', 'MA20', 'MA30'],
        selected: {
          'K线': true,
          'MA5': false,
          'MA10': false,
          'MA20': false,
          'MA30': false,
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      animation: false,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%'
      },
      xAxis: {
        type: 'category',
        data: data.categoryData,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      yAxis: {
        scale: true,
        splitArea: {
          show: false
        },
        splitLine: {
          show: false  // 去掉横向网格线
        }
      },
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: data.values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upBorderColor,
            borderColor0: downBorderColor
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: calculateMA(5, data),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA10',
          type: 'line',
          data: calculateMA(10, data),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA20',
          type: 'line',
          data: calculateMA(20, data),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA30',
          type: 'line',
          data: calculateMA(30, data),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        }
      ]
    };
  }

  if (type === 'treemap') {
    const msgText = typeof msg === 'object' ? (msg.tooltipTitle || '持仓量') : msg;
    const isPositionsize = typeof msg === 'object' ? msg.context === 'positionsize' : (msg === '持仓量');
    const isTradevol = typeof msg === 'object' ? msg.context === 'tradevol' : (msg === '成交量');
    const baseConfig = {
      series: [
        {
          type: 'treemap',
          roam: (isPositionsize || isTradevol) ? false : true, // 持仓量和成交额页面禁用缩放
          label: {
            show: true,
            position: ['5%', '30%'],
            formatter: (info) => {
              let tip = [
                  `{nameClass|${info.name}}`,
                  `{valueClass|${info.data.valueDisplay}}`
                ].join('\n');
              return tip;
            },
            rich: {}
          },
          data,
          itemStyle: {
            borderColor: '#fff'
          },
          levels: [{
            itemStyle: {
              borderWidth: 0,
              gapWidth: 1
            }
          }],
          breadcrumb: {
            show: false
          }
        }
      ],
      tooltip: {
        formatter: function (info) {
          let value = info.value;
          let valueDisplay = info.data.valueDisplay;
          let name = info.name;
          let tip = `
              ${name}
              ${msgText}: ${valueDisplay}
          `;
          return tip;
        },
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderWidth: 0,
        textStyle: {
          color: '#fff'
        },
        confine: true
      },
    };
    
    // 如果是成交量或持仓量界面，添加特殊配置让图表占满
    if (isTradevol || isPositionsize) {
      baseConfig.series[0] = {
        ...baseConfig.series[0],
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%'
      };
    }
    
    return baseConfig;
  }

  if (type === 'linebar') {
    console.log('📊 linebar配置 - 输入数据:', data);
    console.log('📊 linebar配置 - msg:', msg);
    console.log('📊 xAxisData:', data?.xAxisData);
    console.log('📊 barData:', data?.barData);
    console.log('📊 lineData:', data?.lineData);
    
    const isPositionsize = typeof msg === 'object' ? msg.context === 'positionsize' : (msg === '持仓');
    const isTradevol = typeof msg === 'object' ? msg.context === 'tradevol' : (msg === '成交额');
    const leftName = typeof msg === 'object' ? (msg.leftName || '持仓') : msg;
    const rightName = typeof msg === 'object' && msg.rightName ? msg.rightName : '价格';
    // 国际化单位
    const unitYi = typeof msg === 'object' && msg.unitYi ? msg.unitYi : '亿';
    const unitWan = typeof msg === 'object' && msg.unitWan ? msg.unitWan : '万';
    const baseConfig = {
      grid: {
        // 参考原项目：持仓页面增加右侧边距以确保Y轴标签完整显示
        left: isPositionsize ? '10%' : '15%',
        right: isPositionsize ? '15%' : '15%',
        top: '12%',
        bottom: '25%',
        containLabel: false
      },
      tooltip: {
        trigger: 'axis',
        formatter: function (info) {
          if (!info || info.length === 0) return '';
          console.log('tooltip info', info);
          try {
            if (info[0]?.data?.toolTips) {
              let valueList = info[0].data.toolTips;
              let tips = '';
              valueList.forEach((item) => {
                tips += `${item.exchange}: ${item.value}<br/>`;
              });
              return tips;
            }
          } catch (e) {
            console.error('tooltip格式化失败:', e);
          }
          return `${info[0].name}: ${info[0].value}`;
        }
      },
      legend: {
        show: true,
        top: '0%',
        data: [leftName, rightName],
        selectedMode: false
      },
      xAxis: [
        {
          type: 'category',
          data: data?.xAxisData || [],
          axisPointer: {
            type: 'line'
          },
          axisLabel: {
            // 历史持仓量和成交额使用更短的标签并取消旋转
            rotate: (isPositionsize || isTradevol) ? 0 : 45,
            fontSize: 10,
            formatter: (value) => {
              // 持仓量和成交额都使用 yy-mm-dd 格式
              if (isPositionsize || isTradevol) {
                try {
                  const str = String(value);
                  const m = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                  if (m) {
                    const yy = m[1].slice(2);
                    const mm = m[2].padStart(2, '0');
                    const dd = m[3].padStart(2, '0');
                    return `${yy}-${mm}-${dd}`;
                  }
                  const d = new Date(str);
                  if (!isNaN(d.getTime())) {
                    const yy = String(d.getFullYear()).slice(2);
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yy}-${mm}-${dd}`;
                  }
                } catch (e) {
                  // fallback
                }
              }
              return value;
            }
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: leftName,
          position: 'left',
          // 左侧：对齐原项目逻辑——持仓页面去掉美元符号，并按“亿”为单位展示整数
          min: function(value) {
            if (isPositionsize) {
              return Math.floor(value.min * 0.9);
            }
            return undefined;
          },
          minInterval: isPositionsize ? 1 : undefined,
          axisLabel: {
            formatter: (value) => {
              if (isTradevol) {
                // 成交额页面：使用国际化单位
                const intValue = Math.floor(value);
                return `${intValue}${unitYi}`;
              } else if (isPositionsize) {
                // 历史持仓量：使用国际化单位，展示整数
                const intValue = Math.floor(value);
                return `${intValue}${unitYi}`;
              }
              return data?.yAxisLeftSlot ? data.yAxisLeftSlot.replace('{}', value) : value;
            }
          }
        },
        {
          type: 'value',
          name: rightName,
          position: 'right',
          // 右侧：对齐原项目逻辑——持仓页面把“千”转换为“万”，不展示小数，并隐藏辅助线
          min: isPositionsize ? 20000 : undefined,
          max: isPositionsize ? function(value) { return value.max; } : undefined,
          splitLine: { show: isPositionsize ? false : true },
          axisLabel: {
            formatter: (value) => {
              if (isTradevol) {
                // 成交额：转换为“万”单位
                const tenThousandValue = (value / 10000).toFixed(1);
                return `${tenThousandValue}${unitWan}`;
              } else if (isPositionsize) {
                // 历史持仓量：当前数据为“千”，转换为“万”，不显示小数
                const tenThousandValue = Math.floor(value / 10);
                return `${tenThousandValue}${unitWan}`;
              }
              return data?.yAxisRightSlot ? data.yAxisRightSlot.replace('{}', value) : value;
            }
          }
        }
      ],
      series: [
        {
          name: leftName || '持仓',
          type: 'bar',
          data: data?.barData || [],
          itemStyle: {
            color: '#11B787'
          },
          barWidth: '60%'
        },
        {
          name: rightName,
          type: 'line',
          yAxisIndex: 1,
          data: data?.lineData || [],
          lineStyle: {
            color: '#FF9A37',
            width: 2
          },
          itemStyle: {
            color: '#FF9A37'
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          start: 80,
          end: 100,
          bottom: '5%',
          height: 20
        }
      ],
    };
    
    console.log('✅ linebar配置生成完成:', baseConfig);
    return baseConfig;
  }

  if (type === 'updownbarline') {
    return {
      grid: {
        left: '10%',
        right: '10%',
        top: '10%',
        bottom: '25%',
        containLabel: false
      },
      tooltip: {
        trigger: 'axis',
        formatter: function (info) {
          console.log('info', info);
          let valueList = info[0].data.toolTips;
          let tips = '';
          valueList.forEach((item) => {
            tips += `
              ${item.url}${item.exchange}${item.value}
            `
          });
          return tips;
        }
      },
      legend: {
        selectedMode: false
      },
      xAxis: [
        {
          type: 'category',
          data: data.xAxisData,
          axisPointer: {
            type: 'line'
          },
          axisLabel: {
            margin: 12  // x轴标签与轴线的距离
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          axisLabel: {
            formatter: (value) => data.yAxisLeftSlot.replace('{}', value) ?? value
          }
        },
        {
          type: 'value',
          axisLabel: {
            formatter: (value) => data.yAxisRightSlot.replace('{}', value) ?? value
          }
        }
      ],
      series: [
        {
          // name: '',
          type: 'bar',
          stack: 'one',
          color: '#02c076',
          data: data.upData
        },
        {
          // name: '',
          type: 'bar',
          stack: 'one',
          color: '#ff3333',
          data: data.downData
        },
        {
          // name: '价格',
          type: 'line',
          yAxisIndex: 1,
          data: data.coinFee,
          lineStyle: {
            color: '#FF9A37',
            width: 2
          },
          itemStyle: {
            color: '#FF9A37'
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100
        },
        {
          // 需要展示滑动块，用来辅助
          show: true,
          type: 'slider',
          start: 80,
          end: 100,
          bottom: '8%',  // 从底部往上8%的位置
          height: 20,
          showDataShadow: false,
          showDetail: false
        }
      ],
    };
  }

  // 默认返回空配置
  return {
    title: {
      text: '暂无数据'
    }
  };
};