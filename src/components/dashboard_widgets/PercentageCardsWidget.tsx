// src/components/dashboard_widgets/PercentageCardsWidget.tsx
import React from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Reutilizando CardNumberWidget para os sub-itens
import CardNumberWidget from './CardNumberWidget'; // Supondo que está na mesma pasta

interface DataSourceConfig {
    sourceName: string;
    label?: string;
    format?: "percentage" | "number"; // Aqui esperamos que 'percentage' já venha como número (ex: 99.5 para 99.5%)
    unit?: string; // A unidade "%" será adicionada automaticamente se format for 'percentage'
    defaultValue?: any;
}

interface PercentageCardsWidgetProps {
    title: string;
    dataSources: DataSourceConfig[];
    allData: any; // Objeto com chaves dos sourceName e seus valores
    displayOptions?: {
        precision?: number;
    }
}

const PercentageCardsWidget: React.FC<PercentageCardsWidgetProps> = ({ title, dataSources, allData, displayOptions }) => {
    return (
        <Card style={{ minWidth: '300px', margin: '10px' }} bg="primary">
            <Card.Header as="h6" >{title}</Card.Header>
            <Card.Body >
                <Row xs={1} md={2} className="g-3"> {/* Ajuste md={2} ou md={3} conforme o número de itens */}
                    {dataSources.map(ds => {
                        let value = allData[ds.sourceName];
                        let unit = ds.unit;

                        if (value === undefined || value === null) {
                            value = ds.defaultValue ?? 'N/A';
                        }
                        
                        if (ds.format === 'percentage' && typeof value === 'number') {
                            unit = '%'; // Adiciona o % como unidade
                        }
                        
                        return (
                            <Col key={ds.sourceName} >
                                <CardNumberWidget 
                                    title={ds.label || ds.sourceName}
                                    value={value}
                                    unit={unit}
                                    precision={displayOptions?.precision ?? (ds.format === 'percentage' ? 1 : 0)}
                                    
                                />
                            </Col>
                        );
                    })}
                </Row>
                {dataSources.length === 0 && <p>Nenhum dado para exibir.</p>}
            </Card.Body>
        </Card>
    );
};

export default PercentageCardsWidget;