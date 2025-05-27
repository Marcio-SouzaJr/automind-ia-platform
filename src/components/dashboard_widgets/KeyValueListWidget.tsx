// src/components/dashboard_widgets/KeyValueListWidget.tsx
import React from 'react';
import Card from 'react-bootstrap/Card'; // Usando Card do Bootstrap para um visual básico
import ListGroup from 'react-bootstrap/ListGroup';

interface DataSourceConfig {
    sourceName: string;
    label?: string;
    format?: "datetime" | "percentage" | "number";
    unit?: string;
    defaultValue?: any;
}

interface KeyValueListWidgetProps {
    title: string;
    dataSources: DataSourceConfig[]; // A configuração de quais dados mostrar
    allData: any; // O objeto que contém os dados (com chaves dos sourceName)
    displayOptions?: {
        precision?: number;
    }
}

const KeyValueListWidget: React.FC<KeyValueListWidgetProps> = ({ title, dataSources, allData, displayOptions }) => {
    return (
        <Card style={{ minWidth: '280px', margin: '10px' }} bg="light">
            <Card.Header style={{"color": "black"}} as="h6">{title}</Card.Header>
            <ListGroup variant="flush">
                {dataSources.map(ds => {
                    let value = allData[ds.sourceName];

                    if (value === undefined || value === null) {
                        value = ds.defaultValue ?? 'N/A';
                    } else if (typeof value === 'boolean') {
                        value = value ? 'Sim' : 'Não';
                    } else if (ds.format === 'percentage' && typeof value === 'number') {
                        value = `${value.toFixed(displayOptions?.precision ?? 1)}%`;
                    } else if (ds.unit && typeof value === 'number') {
                         // Se já é um número formatado como string com unidade (ex: "2.21 min"), não adicione unidade de novo
                        if (typeof value === 'number') {
                            value = `${value.toFixed(displayOptions?.precision ?? (ds.unit === 'min' ? 2 : 0))} ${ds.unit}`;
                        }
                    } else if (typeof value === 'number') {
                        value = value.toFixed(displayOptions?.precision ?? 0);
                    }
                    // Timestamps já devem vir formatados da DashboardPage, mas um fallback:
                    else if (ds.format === 'datetime' && value && typeof value.toDate === 'function') { // Check for Firestore Timestamp
                        value = value.toDate().toLocaleString('pt-BR');
                    }


                    return (
                        <ListGroup.Item key={ds.sourceName} className="d-flex justify-content-between align-items-start">
                            <div className="ms-2 me-auto">
                                <div className="fw-bold">{ds.label || ds.sourceName}</div>
                            </div>
                            <span className="badge bg-primary rounded-pill">{String(value)}</span>
                        </ListGroup.Item>
                    );
                })}
                {dataSources.length === 0 && <ListGroup.Item>Nenhum dado para exibir.</ListGroup.Item>}
            </ListGroup>
        </Card>
    );
};

export default KeyValueListWidget;