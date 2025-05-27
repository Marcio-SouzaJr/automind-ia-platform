// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import Container from "react-bootstrap/Container";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner"; // Para feedback de loading

// Importando os componentes de widget
import KeyValueListWidget from "../components/dashboard_widgets/KeyValueListWidget";
import CardNumberWidget from "../components/dashboard_widgets/CardNumberWidget";
import PercentageCardsWidget from "../components/dashboard_widgets/PercentageCardsWidget";

// --- Interfaces ---
interface DashboardWidgetConfig {
  widgetId: string;
  title: string;
  type: string;
  dataSources: Array<{
    sourceName: string;
    label?: string;
    sourcePath: string;
    instanceSpecific: boolean;
    format?: "datetime" | "percentage" | "number";
    unit?: string;
    defaultValue?: any;
  }>;
  displayOptions?: {
    unit?: string;
    precision?: number;
  };
}

interface AutomationTemplate {
  id: string;
  name: string;
  dashboardWidgets?: DashboardWidgetConfig[];
}

interface CompanyAutomationInstance {
  id: string;
  automationId: string; // ID do template
  enabled: boolean;
  status?: string;
  lastRun?: Timestamp;
  lastRunDetails?: any;
  config?: {
    manualTimePerClientMinutes?: number;
    // ... outras configs
  };
}

interface PopulatedWidgetInfo {
  config: DashboardWidgetConfig;
  data: any;
  instanceId: string;
  automationName: string;
}

const DashboardPage: React.FC = () => {
  const { dbUser } = useAuth();
  const [widgetsToDisplay, setWidgetsToDisplay] = useState<
    PopulatedWidgetInfo[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      "DashboardPage useEffect: Iniciando busca de dados. dbUser:",
      dbUser
    );
    if (!dbUser?.companyId) {
      console.log(
        "DashboardPage: companyId não encontrado em dbUser. Encerrando busca."
      );
      setError(
        "ID da empresa não encontrado. Não é possível carregar o dashboard."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(
      `DashboardPage: Configurando listener para company_automations da empresa ${dbUser.companyId}`
    );
    const companyAutomationsRef = collection(
      db,
      "companies",
      dbUser.companyId,
      "company_automations"
    );
    const q = query(companyAutomationsRef, where("enabled", "==", true));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        console.log(
          `DashboardPage: Recebido snapshot de company_automations. Quantidade de instâncias habilitadas: ${snapshot.docs.length}`
        );
        if (snapshot.empty) {
          console.log(
            "DashboardPage: Nenhuma automação habilitada encontrada."
          );
          setWidgetsToDisplay([]);
          setLoading(false);
          return;
        }

        const populatedWidgetsPromises = snapshot.docs.map(
          async (instanceDoc) => {
            const instance = {
              id: instanceDoc.id,
              ...instanceDoc.data(),
            } as CompanyAutomationInstance;
            console.log(
              `DashboardPage: Processando instância ${instance.id} (Template ID: ${instance.automationId})`
            );

            if (!instance.automationId) {
              console.warn(
                `DashboardPage: Instância ${instance.id} não tem automationId. Pulando.`
              );
              return [];
            }

            const templateDocRef = doc(
              db,
              "automations",
              instance.automationId
            );
            const templateSnap = await getDoc(templateDocRef);

            if (templateSnap.exists()) {
              const template = {
                id: templateSnap.id,
                ...templateSnap.data(),
              } as AutomationTemplate;
              console.log(
                `DashboardPage: Template ${template.id} ('${template.name}') encontrado para instância ${instance.id}.`
              );

              if (
                template.dashboardWidgets &&
                Array.isArray(template.dashboardWidgets)
              ) {
                console.log(
                  `DashboardPage: Template '${template.name}' tem ${template.dashboardWidgets.length} dashboardWidgets.`
                );

                return template.dashboardWidgets.map((widgetConfig) => {
                  const widgetRenderData: any = {};
                  console.log(
                    `DashboardPage: Processando widget '${widgetConfig.title}' (ID: ${widgetConfig.widgetId}) para automação '${template.name}'`
                  );

                  widgetConfig.dataSources.forEach((ds) => {
                    let value: any;
                    if (ds.instanceSpecific) {
                      // Navega pelo caminho no objeto da instância
                      value = ds.sourcePath
                        ?.split(".")
                        .reduce(
                          (obj, key) =>
                            obj && typeof obj === "object"
                              ? obj[key]
                              : undefined,
                          instance as any
                        );
                      console.log(
                        `   DataSource '${ds.sourceName}' (path: ${ds.sourcePath}): Valor bruto da instância =`,
                        value
                      );
                    } else {
                      // Implementar lógica para fontes não específicas da instância se necessário
                      console.log(
                        `   DataSource '${ds.sourceName}': Não é específico da instância (não implementado ainda).`
                      );
                    }

                    if (value === undefined) {
                      value = ds.defaultValue;
                      console.log(
                        `   DataSource '${ds.sourceName}': Usando defaultValue =`,
                        value
                      );
                    }

                    if (
                      ds.format === "datetime" &&
                      value instanceof Timestamp
                    ) {
                      const formattedDate = value
                        .toDate()
                        .toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      console.log(
                        `   DataSource '${ds.sourceName}': Formatado como datetime =`,
                        formattedDate
                      );
                      value = formattedDate;
                    }
                    widgetRenderData[ds.sourceName] = value;
                  });
                  console.log(
                    `DashboardPage: Dados processados para widget '${widgetConfig.title}':`,
                    widgetRenderData
                  );
                  return {
                    config: widgetConfig,
                    data: widgetRenderData,
                    instanceId: instance.id,
                    automationName: template.name,
                  };
                });
              } else {
                console.log(
                  `DashboardPage: Template '${template.name}' não tem dashboardWidgets definidos ou não é um array.`
                );
                return [];
              }
            } else {
              console.warn(
                `DashboardPage: Template ${instance.automationId} não encontrado para instância ${instance.id}. Pulando widgets desta instância.`
              );
              return [];
            }
          }
        );

        try {
          const results = await Promise.all(populatedWidgetsPromises);
          const flatWidgets = results
            .flat()
            .filter(
              (widget) => widget !== null && widget !== undefined
            ) as PopulatedWidgetInfo[];
          console.log(
            "DashboardPage: Widgets finais processados para exibição:",
            flatWidgets
          );
          setWidgetsToDisplay(flatWidgets);
        } catch (e: any) {
          console.error(
            "DashboardPage: Erro ao processar todos os widgets do dashboard:",
            e
          );
          setError(`Falha ao carregar dados para o dashboard: ${e.message}`);
        } finally {
          setLoading(false);
          console.log("DashboardPage: Carregamento concluído.");
        }
      },
      (err) => {
        console.error(
          "DashboardPage: Erro no listener de company_automations:",
          err
        );
        setError("Falha ao carregar automações para o dashboard.");
        setLoading(false);
      }
    );

    return () => {
      console.log("DashboardPage: Limpando listener de company_automations.");
      unsubscribe();
    };
  }, [dbUser]); // Adicionado dbUser como dependência completa

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p>Carregando Dashboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <h4>Erro ao Carregar Dashboard</h4>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  const widgetsByAutomation: { [key: string]: PopulatedWidgetInfo[] } = {};
  widgetsToDisplay.forEach((widget) => {
    if (!widget) return; // Checagem extra
    const key = `${widget.automationName} (Automação ID: ${widget.instanceId})`; // Usando instanceId para diferenciar se houver múltiplas instâncias do mesmo template (improvável no seu caso atual)
    if (!widgetsByAutomation[key]) {
      widgetsByAutomation[key] = [];
    }
    widgetsByAutomation[key].push(widget);
  });

  return (
    <Container fluid className="mt-4">
      <h1>Dashboard da Empresa</h1>
      {Object.keys(widgetsByAutomation).length === 0 && !loading && (
        <Alert variant="info">
          Nenhum indicador configurado ou nenhuma automação habilitada para
          exibir no dashboard.
        </Alert>
      )}

      {Object.entries(widgetsByAutomation).map(
        ([automationSectionTitle, widgetsInSection]) => (
          <div key={automationSectionTitle} className="mb-5">
            <h2 className="mb-3">{automationSectionTitle}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {widgetsInSection.map((widgetInfo, index) => {
                if (!widgetInfo || !widgetInfo.config) {
                  // Checagem extra
                  console.warn(
                    "Tentando renderizar widgetInfo inválido:",
                    widgetInfo
                  );
                  return null;
                }
                const widgetKey = `${widgetInfo.instanceId}-${widgetInfo.config.widgetId}-${index}`;
                console.log(
                  `DashboardPage: Renderizando widget ${widgetKey}, Tipo: ${widgetInfo.config.type}, Título: ${widgetInfo.config.title}, Dados:`,
                  widgetInfo.data
                );

                console.log(
                  "DashboardPage: Informações do widget ANTES de renderizar KeyValueListWidget:",
                  JSON.stringify(widgetInfo, null, 2)
                );
                switch (widgetInfo.config.type) {
                  case "keyValueList":
                    return (
                      <KeyValueListWidget
                        key={widgetKey}
                        title={widgetInfo.config.title}
                        dataSources={widgetInfo.config.dataSources}
                        allData={widgetInfo.data}
                        displayOptions={widgetInfo.config.displayOptions}
                      />
                    );
                  case "cardNumber":
                    const cardValueSource = widgetInfo.config.dataSources[0];
                    const cardValue = cardValueSource
                      ? widgetInfo.data[cardValueSource.sourceName]
                      : widgetInfo.config.dataSources[0]?.defaultValue ?? "N/A";
                    return (
                      <CardNumberWidget
                        key={widgetKey}
                        title={widgetInfo.config.title}
                        value={cardValue}
                        unit={
                          widgetInfo.config.displayOptions?.unit ||
                          cardValueSource?.unit
                        }
                        precision={
                          widgetInfo.config.displayOptions?.precision ??
                          (cardValueSource?.format === "percentage" ? 1 : 0)
                        }
                      />
                    );
                  case "percentageCards":
                    return (
                      <PercentageCardsWidget
                        key={widgetKey}
                        title={widgetInfo.config.title}
                        dataSources={widgetInfo.config.dataSources.map(ds => {
                          // Remove "datetime" from format if present
                          if (ds.format === "datetime") {
                            const { format, ...rest } = ds;
                            return rest;
                          }
                          return ds;
                        })}
                        allData={widgetInfo.data}
                        displayOptions={widgetInfo.config.displayOptions}
                      />
                    );
                  default:
                    return (
                      <Alert
                        variant="light"
                        key={widgetKey}
                        className="p-3 m-2 shadow-sm"
                      >
                        Widget com tipo não implementado:{" "}
                        <strong>{widgetInfo.config.type}</strong> <br />
                        Título: {widgetInfo.config.title}
                      </Alert>
                    );
                }
              })}
            </div>
            <hr className="mt-5" />
          </div>
        )
      )}
    </Container>
  );
};

export default DashboardPage;
