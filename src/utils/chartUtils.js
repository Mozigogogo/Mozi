export const handleOptions = (data, type, msg) => {
  console.log('Chart data:', data, 'Type:', type);
  
  if (type === 'samebar') {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        }
      },
      legend: {
        selectedMode: false,
        data: ['空', '多', '多空比'],
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
          name: '空',
          type: 'bar',
          stack: 'total',
          color: '#FA5F5F',
          data: data.shortData
        },
        {
          name: '多',
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
    // K线图配置
    const upColor = '#02c076';  // 阳线颜色
    const upBorderColor = '#008F28';
    const downColor = '#ff3333'; // 阴线颜色
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
          show: true
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
    return {
      series: [
        {
          type: 'treemap',
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
              ${msg}: ${valueDisplay}
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
    }
  }

  if (type === 'linebar') {
    console.log('📊 linebar配置 - 输入数据:', data);
    console.log('📊 linebar配置 - msg:', msg);
    console.log('📊 xAxisData:', data?.xAxisData);
    console.log('📊 barData:', data?.barData);
    console.log('📊 lineData:', data?.lineData);
    
    const option = {
      grid: {
        top: '15%',
        left: '10%',
        right: '10%',
        bottom: '15%',
        containLabel: true
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
        data: [msg, '价格'],
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
            rotate: 45,
            fontSize: 10
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: msg,
          position: 'left',
          axisLabel: {
            formatter: (value) => {
              if (data?.yAxisLeftSlot) {
                return data.yAxisLeftSlot.replace('{}', value);
              }
              return value;
            }
          }
        },
        {
          type: 'value',
          name: '价格',
          position: 'right',
          axisLabel: {
            formatter: (value) => {
              if (data?.yAxisRightSlot) {
                return data.yAxisRightSlot.replace('{}', value);
              }
              return value;
            }
          }
        }
      ],
      series: [
        {
          name: msg || '持仓',
          type: 'bar',
          data: data?.barData || [],
          itemStyle: {
            color: '#11B787'
          },
          barWidth: '60%'
        },
        {
          name: '价格',
          type: 'line',
          yAxisIndex: 1,
          data: data?.lineData || [],
          lineStyle: {
            color: '#FA5F5F',
            width: 2
          },
          itemStyle: {
            color: '#FA5F5F'
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
    
    console.log('✅ linebar配置生成完成:', option);
    return option;
  }

  if (type === 'updownbarline') {
    return {
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
          data: data.coinFee
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
          top: '87%',
          height: 20
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