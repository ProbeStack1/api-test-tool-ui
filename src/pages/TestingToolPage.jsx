import React from 'react';
import IDEWorkspaceLayout from '../components/IDEWorkspaceLayout';

/**
 * Testing Tool page – separate route /workspace.
 * All request/workspace state and handlers are passed from App.
 */
export default function TestingToolPage({
  history,
  requests,
  activeRequestIndex,
  onTabSelect,
  onNewTab,
  onCloseTab,
  onTabRename,
  method,
  url,
  queryParams,
  headers,
  body,
  authType,
  authData,
  preRequestScript,
  tests,
  response,
  isLoading,
  error,
  environments,
  selectedEnvironment,
  onSelectEndpoint,
  onMethodChange,
  onUrlChange,
  onQueryParamsChange,
  onHeadersChange,
  onBodyChange,
  onAuthTypeChange,
  onAuthDataChange,
  onPreRequestScriptChange,
  onTestsChange,
  onExecute,
  onNewRequest,
  onEnvironmentChange,
}) {
  return (
    <IDEWorkspaceLayout
      history={history}
      requests={requests}
      activeRequestIndex={activeRequestIndex}
      onTabSelect={onTabSelect}
      onNewTab={onNewTab}
      onCloseTab={onCloseTab}
      onTabRename={onTabRename}
      method={method}
      url={url}
      queryParams={queryParams}
      headers={headers}
      body={body}
      authType={authType}
      authData={authData}
      preRequestScript={preRequestScript}
      tests={tests}
      response={response}
      isLoading={isLoading}
      error={error}
      environments={environments}
      selectedEnvironment={selectedEnvironment}
      onSelectEndpoint={onSelectEndpoint}
      onMethodChange={onMethodChange}
      onUrlChange={onUrlChange}
      onQueryParamsChange={onQueryParamsChange}
      onHeadersChange={onHeadersChange}
      onBodyChange={onBodyChange}
      onAuthTypeChange={onAuthTypeChange}
      onAuthDataChange={onAuthDataChange}
      onPreRequestScriptChange={onPreRequestScriptChange}
      onTestsChange={onTestsChange}
      onExecute={onExecute}
      onNewRequest={onNewRequest}
      onEnvironmentChange={onEnvironmentChange}
    />
  );
}
